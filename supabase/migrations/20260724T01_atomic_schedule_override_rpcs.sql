-- =============================================================================
-- Migration: 20260724T01_atomic_schedule_override_rpcs
-- Purpose  : Two SECURITY DEFINER RPCs for atomic schedule override operations:
--            1. create_extra_shift_atomic — inserts schedule_overrides (is_extra_shift=true)
--               + extra_hours_log (positive, reference_type='extra_shift') in one transaction.
--            2. mark_absence_atomic — advisory-locked dup-check + inserts
--               schedule_overrides (is_absence=true) + extra_hours_log (negative hours,
--               reference_type='absence') atomically. Raises on duplicate range.
--
-- Both functions are admin-only (auth.uid() must exist in user_profiles with role='admin').
-- p_admin_id defaults to auth.uid(); client may pass it explicitly for service-role contexts.
--
-- Rollback: DROP FUNCTION IF EXISTS public.create_extra_shift_atomic(...);
--           DROP FUNCTION IF EXISTS public.mark_absence_atomic(...);
--           Revert scheduleOverridesService.ts to the pre-RPC double-write implementation.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. create_extra_shift_atomic
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_extra_shift_atomic(
  p_user_id        uuid,
  p_date           date,
  p_start_time     time,
  p_end_time       time,
  p_reason         text,
  p_log_description text,
  p_admin_id       uuid DEFAULT auth.uid()
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hours      numeric;
  v_override_id bigint;
BEGIN
  -- Admin guard: caller must be an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo los administradores pueden registrar turnos extra';
  END IF;

  -- Secondary guard: p_admin_id must match the session user (no impersonation)
  IF p_admin_id IS DISTINCT FROM auth.uid() AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'p_admin_id debe coincidir con el usuario autenticado';
  END IF;

  -- Compute hours server-side
  v_hours := ROUND(
    EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600.0,
    2
  );

  -- 1. Insert schedule override
  INSERT INTO public.schedule_overrides (
    user_id,
    override_date,
    is_day_off,
    is_extra_shift,
    start_time,
    end_time,
    reason,
    created_by
  ) VALUES (
    p_user_id,
    p_date,
    false,
    true,
    p_start_time,
    p_end_time,
    p_reason,
    COALESCE(p_admin_id, auth.uid())
  )
  RETURNING id INTO v_override_id;

  -- 2. Insert extra hours credit
  INSERT INTO public.extra_hours_log (
    user_id,
    hours,
    description,
    reference_type,
    reference_id,
    created_by
  ) VALUES (
    p_user_id,
    v_hours,
    p_log_description,
    'extra_shift',
    v_override_id,
    COALESCE(p_admin_id, auth.uid())
  );

  RETURN v_override_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_extra_shift_atomic(uuid, date, time, time, text, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_extra_shift_atomic(uuid, date, time, time, text, text, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.create_extra_shift_atomic(uuid, date, time, time, text, text, uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. mark_absence_atomic
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_absence_atomic(
  p_user_id        uuid,
  p_date           date,
  p_missed_start   time,
  p_missed_end     time,
  p_is_day_off     boolean,
  p_reason         text,
  p_log_description text,
  p_admin_id       uuid DEFAULT auth.uid()
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hours      numeric;
  v_override_id bigint;
BEGIN
  -- Admin guard
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo los administradores pueden registrar inasistencias';
  END IF;

  -- Secondary guard: no impersonation
  IF p_admin_id IS DISTINCT FROM auth.uid() AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'p_admin_id debe coincidir con el usuario autenticado';
  END IF;

  -- Advisory lock: prevents concurrent inserts for the same user+date
  PERFORM pg_advisory_xact_lock(
    hashtext(p_user_id::text || p_date::text)::bigint
  );

  -- Duplicate check for the same missed range on the same date
  IF EXISTS (
    SELECT 1 FROM public.schedule_overrides
    WHERE user_id       = p_user_id
      AND override_date = p_date
      AND is_absence    = true
      AND start_time    = p_missed_start
      AND end_time      = p_missed_end
  ) THEN
    RAISE EXCEPTION 'Ya existe un registro para este rango de tiempo';
  END IF;

  -- Compute missed hours server-side
  v_hours := ROUND(
    EXTRACT(EPOCH FROM (p_missed_end - p_missed_start)) / 3600.0,
    2
  );

  -- 1. Insert schedule override
  INSERT INTO public.schedule_overrides (
    user_id,
    override_date,
    is_day_off,
    is_absence,
    start_time,
    end_time,
    reason,
    created_by
  ) VALUES (
    p_user_id,
    p_date,
    p_is_day_off,
    true,
    p_missed_start,
    p_missed_end,
    p_reason,
    COALESCE(p_admin_id, auth.uid())
  )
  RETURNING id INTO v_override_id;

  -- 2. Insert negative hours debit
  INSERT INTO public.extra_hours_log (
    user_id,
    hours,
    description,
    reference_type,
    reference_id,
    created_by
  ) VALUES (
    p_user_id,
    -v_hours,
    p_log_description,
    'absence',
    v_override_id,
    COALESCE(p_admin_id, auth.uid())
  );

  RETURN v_override_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_absence_atomic(uuid, date, time, time, boolean, text, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_absence_atomic(uuid, date, time, time, boolean, text, text, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.mark_absence_atomic(uuid, date, time, time, boolean, text, text, uuid) TO authenticated;
