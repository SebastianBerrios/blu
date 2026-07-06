-- Migration: Add missing FK covering indexes
-- Verified against get_advisors unindexed_foreign_keys on 2026-07-06 by orchestrator.
-- These 6 indexes cover FK columns that were flagged as unindexed, which can degrade
-- CASCADE DELETE/UPDATE performance and trigger advisor warnings.
--
-- NOTE: No indexes are dropped in this migration. The ~40 "unused index" advisories
-- are FK-covering and filter indexes that appear unused only due to low DB traffic
-- (pg_stat_user_indexes not yet accumulated). Dropping them would degrade cascades
-- and re-trigger unindexed_foreign_keys advisories. Revisit after production traffic
-- has accumulated meaningful pg_stat_user_indexes data.
--
-- Rollback:
--   DROP INDEX IF EXISTS idx_productions_recipe_id;
--   DROP INDEX IF EXISTS idx_productions_reversed_by;
--   DROP INDEX IF EXISTS idx_productions_user_id;
--   DROP INDEX IF EXISTS idx_role_permissions_updated_by;
--   DROP INDEX IF EXISTS idx_sales_last_edited_by;
--   DROP INDEX IF EXISTS idx_sales_payment_registered_by;

CREATE INDEX IF NOT EXISTS idx_productions_recipe_id        ON public.productions (recipe_id);
CREATE INDEX IF NOT EXISTS idx_productions_reversed_by      ON public.productions (reversed_by);
CREATE INDEX IF NOT EXISTS idx_productions_user_id          ON public.productions (user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_updated_by  ON public.role_permissions (updated_by);
CREATE INDEX IF NOT EXISTS idx_sales_last_edited_by         ON public.sales (last_edited_by);
CREATE INDEX IF NOT EXISTS idx_sales_payment_registered_by  ON public.sales (payment_registered_by);
