-- Migration: Activities catalog + assignments (rediseño de Actividades)
-- Separates the WHAT (activities catalog) from the WHO (assignments), adds
-- description + richer frequencies (daily/weekly/interval/on_demand), and fixes
-- task_completions to be scoped per (activity, user, day).
--
-- Rollback (manual): DROP TABLE activity_assignments; DROP FUNCTION
--   upsert_activity_with_assignments; restore task_completions.task_id; DROP TABLE activities.

-- ---------------------------------------------------------------------------
-- 1. Catalog table: activities (the WHAT)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
  id            serial PRIMARY KEY,
  title         text NOT NULL,
  description   text,
  category      text NOT NULL,
  frequency     text NOT NULL,
  days_of_week  smallint[],
  interval_days smallint,
  anchor_date   date,
  sort_order    integer DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activities_category_check
    CHECK (category = ANY (ARRAY['apertura','jornada','cierre'])),
  CONSTRAINT activities_frequency_check
    CHECK (frequency = ANY (ARRAY['daily','weekly','interval','on_demand'])),
  CONSTRAINT activities_days_of_week_valid
    CHECK (days_of_week IS NULL OR (array_length(days_of_week, 1) > 0
           AND days_of_week <@ ARRAY[0,1,2,3,4,5]::smallint[])),
  CONSTRAINT activities_weekly_must_have_days
    CHECK (frequency <> 'weekly' OR (days_of_week IS NOT NULL AND array_length(days_of_week, 1) > 0)),
  CONSTRAINT activities_interval_needs_config
    CHECK (frequency <> 'interval' OR (interval_days IS NOT NULL AND interval_days > 0 AND anchor_date IS NOT NULL))
);

-- ---------------------------------------------------------------------------
-- 2. Assignment table: activity_assignments (the WHO)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_assignments (
  id          serial PRIMARY KEY,
  activity_id integer NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_assignments_unique UNIQUE (activity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_assignments_activity ON public.activity_assignments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_assignments_user ON public.activity_assignments(user_id);

-- ---------------------------------------------------------------------------
-- 3. Data migration: employee_tasks -> activities (+ assignments)
--    Dedup by (title, category, frequency, days_of_week): the same activity
--    assigned to several people becomes ONE catalog entry with many assignments.
-- ---------------------------------------------------------------------------
INSERT INTO public.activities (title, category, frequency, days_of_week, sort_order, is_active, created_at, updated_at)
SELECT DISTINCT ON (title, category, frequency, days_of_week)
  title, category, frequency, days_of_week, sort_order, true, now(), now()
FROM public.employee_tasks
WHERE is_active
ORDER BY title, category, frequency, days_of_week, sort_order;

INSERT INTO public.activity_assignments (activity_id, user_id)
SELECT a.id, et.user_id
FROM public.employee_tasks et
JOIN public.activities a
  ON a.title = et.title
 AND a.category = et.category
 AND a.frequency = et.frequency
 AND a.days_of_week IS NOT DISTINCT FROM et.days_of_week
WHERE et.is_active
ON CONFLICT (activity_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Rework task_completions: task_id -> activity_id, UNIQUE per (activity,user,day)
-- ---------------------------------------------------------------------------
ALTER TABLE public.task_completions ADD COLUMN IF NOT EXISTS activity_id integer;

UPDATE public.task_completions tc
SET activity_id = a.id
FROM public.employee_tasks et
JOIN public.activities a
  ON a.title = et.title
 AND a.category = et.category
 AND a.frequency = et.frequency
 AND a.days_of_week IS NOT DISTINCT FROM et.days_of_week
WHERE tc.task_id = et.id;

-- Drop any completion that could not be remapped (none expected: FK cascade guarantees a live task)
DELETE FROM public.task_completions WHERE activity_id IS NULL;

-- Defensive dedup before the new unique (activity_id, user_id, completion_date)
DELETE FROM public.task_completions a
USING public.task_completions b
WHERE a.id > b.id
  AND a.activity_id = b.activity_id
  AND a.user_id = b.user_id
  AND a.completion_date = b.completion_date;

ALTER TABLE public.task_completions DROP CONSTRAINT IF EXISTS task_completions_task_id_completion_date_key;
ALTER TABLE public.task_completions DROP CONSTRAINT IF EXISTS task_completions_task_id_fkey;
ALTER TABLE public.task_completions DROP COLUMN IF EXISTS task_id;

ALTER TABLE public.task_completions ALTER COLUMN activity_id SET NOT NULL;
ALTER TABLE public.task_completions
  ADD CONSTRAINT task_completions_activity_id_fkey
  FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;
ALTER TABLE public.task_completions
  ADD CONSTRAINT task_completions_activity_user_date_key
  UNIQUE (activity_id, user_id, completion_date);

CREATE INDEX IF NOT EXISTS idx_task_completions_activity ON public.task_completions(activity_id);

-- ---------------------------------------------------------------------------
-- 5. RLS (catalog pattern: read for any auth, write admin-only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY activities_select ON public.activities
  FOR SELECT TO authenticated USING (true);
CREATE POLICY activities_insert ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles
                      WHERE id = (SELECT auth.uid()) AND role = 'admin'::app_role));
CREATE POLICY activities_update ON public.activities
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = (SELECT auth.uid()) AND role = 'admin'::app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles
                      WHERE id = (SELECT auth.uid()) AND role = 'admin'::app_role));
CREATE POLICY activities_delete ON public.activities
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = (SELECT auth.uid()) AND role = 'admin'::app_role));

CREATE POLICY activity_assignments_select ON public.activity_assignments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY activity_assignments_insert ON public.activity_assignments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles
                      WHERE id = (SELECT auth.uid()) AND role = 'admin'::app_role));
CREATE POLICY activity_assignments_update ON public.activity_assignments
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = (SELECT auth.uid()) AND role = 'admin'::app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles
                      WHERE id = (SELECT auth.uid()) AND role = 'admin'::app_role));
CREATE POLICY activity_assignments_delete ON public.activity_assignments
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = (SELECT auth.uid()) AND role = 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- 6. Atomic upsert RPC: activity + assignment reconciliation (admin-only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_activity_with_assignments(
  p_activity_id  integer,
  p_title        text,
  p_description  text,
  p_category     text,
  p_frequency    text,
  p_days_of_week smallint[],
  p_interval_days smallint,
  p_anchor_date  date,
  p_sort_order   integer,
  p_assignee_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden gestionar actividades';
  END IF;

  IF p_activity_id IS NULL THEN
    INSERT INTO public.activities
      (title, description, category, frequency, days_of_week, interval_days, anchor_date, sort_order)
    VALUES
      (p_title, p_description, p_category, p_frequency, p_days_of_week, p_interval_days, p_anchor_date, COALESCE(p_sort_order, 0))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.activities SET
      title = p_title,
      description = p_description,
      category = p_category,
      frequency = p_frequency,
      days_of_week = p_days_of_week,
      interval_days = p_interval_days,
      anchor_date = p_anchor_date,
      sort_order = COALESCE(p_sort_order, sort_order),
      updated_at = now()
    WHERE id = p_activity_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Actividad % no encontrada', p_activity_id;
    END IF;
  END IF;

  -- Reconcile assignments: remove dropped, add new.
  DELETE FROM public.activity_assignments
  WHERE activity_id = v_id
    AND NOT (user_id = ANY (COALESCE(p_assignee_ids, ARRAY[]::uuid[])));

  INSERT INTO public.activity_assignments (activity_id, user_id)
  SELECT v_id, uid
  FROM unnest(COALESCE(p_assignee_ids, ARRAY[]::uuid[])) AS uid
  ON CONFLICT (activity_id, user_id) DO NOTHING;

  RETURN v_id;
END;
$$;

-- Supabase default privileges grant EXECUTE to anon on new public functions,
-- so REVOKE FROM PUBLIC is not enough — revoke anon explicitly.
REVOKE EXECUTE ON FUNCTION public.upsert_activity_with_assignments(integer, text, text, text, text, smallint[], smallint, date, integer, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_activity_with_assignments(integer, text, text, text, text, smallint[], smallint, date, integer, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.upsert_activity_with_assignments(integer, text, text, text, text, smallint[], smallint, date, integer, uuid[]) TO authenticated;
