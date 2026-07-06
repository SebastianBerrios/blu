-- =============================================================================
-- Migration: 20260706T04_backfill_orphan_sales
-- Purpose  : Backfill historically orphaned sales (paid sales without a
--            matching transaction row) by inserting the missing transaction
--            records directly, WITHOUT touching accounts.balance.
--
-- ADR-4 rationale: account balances already reflect the correct real-world
-- amounts (verified by T1.1 dossier). Inserting a historical transaction row
-- with the original payment date reconstructs the audit history cleanly.
-- Calling record_transaction is intentionally avoided here because it would
-- bump account balances a second time, creating phantom drift.
--
-- Known orphans at migration time (2026-07-06, verified by T1.1 dossier):
--   #14  | 2026-03-16 | Para llevar | Efectivo | S/ 13.00
--   #145 | 2026-04-10 | Para llevar | Plin     | S/ 18.00
-- The selection query is DYNAMIC (NOT EXISTS guard) so the migration is
-- idempotent — re-running it is a no-op if the rows already exist.
--
-- Rollback:
--   DELETE FROM public.transactions
--   WHERE reference_type = 'sale'
--     AND description LIKE 'Backfill venta #%';
--   (Balances are NOT touched on rollback either, matching the forward direction.)
-- =============================================================================

DO $$
DECLARE
  v_sale          RECORD;
  v_account_id    bigint;
  v_net_amount    numeric;
  v_created_at    timestamptz;
  v_inserted_count int := 0;
BEGIN
  FOR v_sale IN
    -- Select paid sales that have NO matching transaction row.
    -- Dynamic selection: if additional orphans exist beyond the 2 known ones,
    -- they will be picked up and backfilled here too.
    SELECT
      s.id,
      s.payment_method,
      s.payment_date,
      s.sale_date,
      s.user_id,
      ROUND(
        s.total_price
        - COALESCE(s.discount_amount, 0)
        - COALESCE(s.commission, 0),
        2
      ) AS net_amount
    FROM public.sales s
    WHERE s.payment_method IS NOT NULL
      AND s.payment_method <> 'Pendiente'
      AND NOT EXISTS (
        SELECT 1
        FROM public.transactions t
        WHERE t.reference_type = 'sale'
          AND t.reference_id = s.id
      )
  LOOP
    -- Resolve account by payment_method → account type mapping.
    -- Mirrors buildSalePayments (salesService.ts) payment→account logic.
    CASE v_sale.payment_method
      WHEN 'Efectivo' THEN
        SELECT id INTO v_account_id
        FROM public.accounts WHERE type = 'caja' LIMIT 1;
      WHEN 'Plin' THEN
        SELECT id INTO v_account_id
        FROM public.accounts WHERE type = 'banco' LIMIT 1;
      WHEN 'Rappi' THEN
        SELECT id INTO v_account_id
        FROM public.accounts WHERE type = 'rappi' LIMIT 1;
      WHEN 'POS' THEN
        SELECT id INTO v_account_id
        FROM public.accounts WHERE type = 'pos' LIMIT 1;
      WHEN 'Efectivo + Plin' THEN
        -- Split-payment orphan: use caja for the full net amount and note it.
        -- The two known orphans are Efectivo and Plin; this is a defensive guard.
        SELECT id INTO v_account_id
        FROM public.accounts WHERE type = 'caja' LIMIT 1;
      ELSE
        -- Unknown method — skip this orphan, do not fail the migration.
        RAISE NOTICE 'Backfill: unknown payment_method "%" for sale #%, skipping', v_sale.payment_method, v_sale.id;
        v_account_id := NULL;
    END CASE;

    IF v_account_id IS NULL THEN
      RAISE NOTICE 'Backfill: no account found for sale #% (method: %), skipping', v_sale.id, v_sale.payment_method;
      CONTINUE;
    END IF;

    -- Net amount must be positive to record as ingreso_venta.
    v_net_amount := v_sale.net_amount;
    IF v_net_amount <= 0 THEN
      RAISE NOTICE 'Backfill: sale #% has net_amount = %, skipping', v_sale.id, v_net_amount;
      CONTINUE;
    END IF;

    -- Use original payment_date; fall back to sale_date (both timestamptz).
    v_created_at := COALESCE(
      v_sale.payment_date,
      v_sale.sale_date
    );

    -- Idempotency: inner guard (belt-and-suspenders on top of the outer NOT EXISTS).
    IF NOT EXISTS (
      SELECT 1 FROM public.transactions
      WHERE reference_type = 'sale' AND reference_id = v_sale.id
    ) THEN
      INSERT INTO public.transactions (
        account_id,
        type,
        amount,
        description,
        reference_id,
        reference_type,
        created_at,
        user_id
      ) VALUES (
        v_account_id,
        'ingreso_venta',
        v_net_amount,
        'Backfill venta #' || v_sale.id::text || ' - ' || v_sale.payment_method,
        v_sale.id,
        'sale',
        v_created_at,
        v_sale.user_id   -- Historical actor: the user who made the sale
      );

      v_inserted_count := v_inserted_count + 1;
      RAISE NOTICE 'Backfill: inserted transaction for sale #% (%, S/ %)', v_sale.id, v_sale.payment_method, v_net_amount;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % transaction(s) inserted', v_inserted_count;
END;
$$;

-- Verification query (run after applying to confirm 0 orphans remain):
--
-- SELECT s.id, s.payment_method, s.total_price
-- FROM public.sales s
-- WHERE s.payment_method IS NOT NULL
--   AND s.payment_method <> 'Pendiente'
--   AND NOT EXISTS (
--     SELECT 1 FROM public.transactions t
--     WHERE t.reference_type = 'sale' AND t.reference_id = s.id
--   );
--
-- Expected: 0 rows.
