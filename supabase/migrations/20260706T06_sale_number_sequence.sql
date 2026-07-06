-- Migration: Add persistent sale_number column with sequence to sales table
-- Replaces the racy count-based getSaleNumber(saleId) client query with a stable,
-- non-retroactively-changing column. Gaps on DELETE are acceptable.
--
-- Strategy:
--   1. Add sales.sale_number bigint column (nullable initially for idempotency).
--   2. Backfill: assign row_number() OVER (ORDER BY id) — exactly reproduces the
--      old count semantics so displayed numbers match for existing sales.
--   3. Create sequence seeded at max(sale_number) + 1.
--   4. Attach sequence as default; make column NOT NULL.
--   5. Add BEFORE INSERT trigger so create_sale_atomic INSERTs get the next number
--      automatically (DEFAULT nextval also works, but trigger is explicit and safe
--      even if the INSERT omits the column).
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_sales_sale_number ON public.sales;
--   DROP FUNCTION IF EXISTS public.fn_sales_set_sale_number();
--   DROP SEQUENCE IF EXISTS public.sales_sale_number_seq;
--   ALTER TABLE public.sales DROP COLUMN IF EXISTS sale_number;

-- 1. Add column (idempotent: IF NOT EXISTS supported in Postgres 9.6+)
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS sale_number bigint;

-- 2. Backfill existing rows — dense 1..N ordered by id, matching old count semantics
UPDATE public.sales
SET sale_number = sub.rn
FROM (
  SELECT id, row_number() OVER (ORDER BY id) AS rn
  FROM public.sales
) sub
WHERE public.sales.id = sub.id
  AND public.sales.sale_number IS NULL;

-- 3. Create sequence seeded at max(sale_number) + 1
--    (1 if table is empty, which is valid as a starting seed)
DO $$
DECLARE
  v_max bigint;
BEGIN
  SELECT COALESCE(MAX(sale_number), 0) INTO v_max FROM public.sales;
  EXECUTE format(
    'CREATE SEQUENCE IF NOT EXISTS public.sales_sale_number_seq START WITH %s',
    v_max + 1
  );
END;
$$;

-- 4. Attach sequence as default and enforce NOT NULL
ALTER TABLE public.sales
  ALTER COLUMN sale_number SET DEFAULT nextval('public.sales_sale_number_seq'),
  ALTER COLUMN sale_number SET NOT NULL;

-- 5. BEFORE INSERT trigger — fires even if the INSERT omits sale_number
--    (create_sale_atomic uses RETURNING id; the trigger ensures the column is set)
CREATE OR REPLACE FUNCTION public.fn_sales_set_sale_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.sale_number IS NULL THEN
    NEW.sale_number := nextval('public.sales_sale_number_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_sale_number ON public.sales;
CREATE TRIGGER trg_sales_sale_number
  BEFORE INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sales_set_sale_number();
