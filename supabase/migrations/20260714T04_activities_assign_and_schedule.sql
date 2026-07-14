-- Reassign activities per the owner guide (Piero / Alessandro / Juanjo), add the
-- missing ones, schedule interdiario tasks on the lighter days (Mon/Wed/Fri via a
-- Monday anchor) and spread the weekly deep-cleans onto the lightest days
-- (Monday = quietest, then Friday). Even workload across the three staff.
--
-- Users:  P Piero Berríos     46c5bda4-cca0-4342-a6cc-2e1042868138
--         A Alessandro Vega   516ed4e3-07d5-438d-9f06-97f6ebdf5543
--         J Juanjose Perez    60cd4155-59e7-4f0d-bb68-5d90a9f28ce1
-- Interdiario anchor: 2026-07-13 (Monday) -> falls on Mon/Wed/Fri.

-- 1) New activities (idempotent by title)
INSERT INTO public.activities (title, description, category, frequency, days_of_week, interval_days, anchor_date, sort_order)
SELECT * FROM (VALUES
  ('Limpiar vitrina de empanadas', 'Limpia por dentro y por fuera los vidrios de la vitrina de empanadas y ordena el producto.', 'apertura', 'daily', NULL::smallint[], NULL::smallint, NULL::date, 5),
  ('Limpiar exhibidor de pan', 'Limpia el exhibidor del pan (repisas y vidrios) y ordena el pan.', 'apertura', 'daily', NULL::smallint[], NULL::smallint, NULL::date, 6),
  ('Limpiar pasadizo (espejo y repisa)', 'Limpia el pasadizo: espejo, repisa y consola, y despeja el paso.', 'apertura', 'daily', NULL::smallint[], NULL::smallint, NULL::date, 7),
  ('Verificar batería del POS', 'Revisa que el POS esté cargado y operativo; ponlo a cargar si está bajo.', 'apertura', 'daily', NULL::smallint[], NULL::smallint, NULL::date, 8),
  ('Colocar letrero, espejo y caja de mantas', 'Al abrir, coloca el letrero de la calle, el espejo y la caja de mantas en su sitio.', 'apertura', 'daily', NULL::smallint[], NULL::smallint, NULL::date, 9),
  ('Guardar platos, vasos, cubiertos y ollas', 'Guarda seca toda la vajilla (platos, vasos, cubiertos y ollas) en su lugar; deja las mesas despejadas.', 'cierre', 'daily', NULL::smallint[], NULL::smallint, NULL::date, 5),
  ('Guardar letrero, espejo y caja de mantas', 'Al cerrar, guarda el letrero de la calle, el espejo y la caja de mantas.', 'cierre', 'daily', NULL::smallint[], NULL::smallint, NULL::date, 6),
  ('Limpiar cajones de la barra', 'Vacía, limpia por dentro y ordena los cajones de la barra.', 'cierre', 'interval', NULL::smallint[], 2::smallint, '2026-07-13'::date, 24)
) AS v(title, description, category, frequency, days_of_week, interval_days, anchor_date, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.activities a WHERE a.title = v.title);

-- 2) Repurpose id 31 into the daily "walls where food is prepped" task (was a weekly wall clean I had added)
UPDATE public.activities SET
  title = 'Limpiar paredes de la zona de preparación',
  description = 'Limpia a diario las paredes y mayólicas de la zona donde se prepara (cocina y barra), quitando grasa y salpicaduras.',
  frequency = 'daily', days_of_week = NULL, interval_days = NULL, anchor_date = NULL
WHERE id = 31;

-- 3) Interdiario tasks -> interval 2 anchored on Monday (Mon/Wed/Fri)
UPDATE public.activities SET
  title = 'Limpiar máquina de café, licuadora y microondas',
  description = 'Limpia la máquina de café (grupo, vaporizador y bandeja), la licuadora y el microondas por dentro y por fuera.',
  frequency = 'interval', interval_days = 2, anchor_date = '2026-07-13', days_of_week = NULL
WHERE id = 14;

UPDATE public.activities SET
  title = 'Limpiar por fuera los equipos (licuadora, refrigeradora, cocina a gas y horno)',
  frequency = 'interval', interval_days = 2, anchor_date = '2026-07-13', days_of_week = NULL
WHERE id = 37;

UPDATE public.activities SET
  frequency = 'interval', interval_days = 2, anchor_date = '2026-07-13', days_of_week = NULL
WHERE id = 41;

-- 4) Weekly deep-cleans -> lightest days. Monday (quietest) and Friday.
UPDATE public.activities SET days_of_week = ARRAY[0]::smallint[] WHERE id IN (18, 19, 27, 33, 38);
UPDATE public.activities SET days_of_week = ARRAY[4]::smallint[] WHERE id IN (28, 34, 39, 36, 43);

-- 5) Description tweaks on reassigned tasks
UPDATE public.activities SET
  description = 'Limpia la barra por arriba y por abajo y los cajones; guarda tazas y accesorios, y cierra y ordena los jarabes y botellas.'
WHERE id = 17;
UPDATE public.activities SET
  description = 'Desenchufa y apaga la máquina de café, la licuadora, el horno y la TV; apaga las luces del patio y del local antes de salir.'
WHERE id = 35;

-- 6) Reassign owners of existing activities the guide moves.
DELETE FROM public.activity_assignments WHERE activity_id IN (16, 17, 35, 36, 42, 43, 31);
INSERT INTO public.activity_assignments (activity_id, user_id)
VALUES
  (16, '46c5bda4-cca0-4342-a6cc-2e1042868138'),                                  -- vitrina postres -> P
  (17, '46c5bda4-cca0-4342-a6cc-2e1042868138'),                                  -- barra -> P
  (35, '46c5bda4-cca0-4342-a6cc-2e1042868138'),                                  -- apagar/desenchufar -> P
  (36, '46c5bda4-cca0-4342-a6cc-2e1042868138'),                                  -- vidrios patio -> P
  (43, '46c5bda4-cca0-4342-a6cc-2e1042868138'),                                  -- plantas patio -> P
  (42, '516ed4e3-07d5-438d-9f06-97f6ebdf5543'),                                  -- pozo cocina -> A
  (31, '516ed4e3-07d5-438d-9f06-97f6ebdf5543'),                                  -- paredes zona prep -> A + J
  (31, '60cd4155-59e7-4f0d-bb68-5d90a9f28ce1')
ON CONFLICT (activity_id, user_id) DO NOTHING;

-- 7) Assign owners for the new activities (join by title so it works with the ids just created)
INSERT INTO public.activity_assignments (activity_id, user_id)
SELECT a.id, u.user_id
FROM public.activities a
JOIN (VALUES
  ('Limpiar vitrina de empanadas', '46c5bda4-cca0-4342-a6cc-2e1042868138'::uuid),
  ('Limpiar exhibidor de pan', '46c5bda4-cca0-4342-a6cc-2e1042868138'),
  ('Limpiar pasadizo (espejo y repisa)', '46c5bda4-cca0-4342-a6cc-2e1042868138'),
  ('Verificar batería del POS', '46c5bda4-cca0-4342-a6cc-2e1042868138'),
  ('Colocar letrero, espejo y caja de mantas', '46c5bda4-cca0-4342-a6cc-2e1042868138'),
  ('Colocar letrero, espejo y caja de mantas', '516ed4e3-07d5-438d-9f06-97f6ebdf5543'),
  ('Guardar platos, vasos, cubiertos y ollas', '46c5bda4-cca0-4342-a6cc-2e1042868138'),
  ('Guardar platos, vasos, cubiertos y ollas', '516ed4e3-07d5-438d-9f06-97f6ebdf5543'),
  ('Guardar platos, vasos, cubiertos y ollas', '60cd4155-59e7-4f0d-bb68-5d90a9f28ce1'),
  ('Guardar letrero, espejo y caja de mantas', '46c5bda4-cca0-4342-a6cc-2e1042868138'),
  ('Guardar letrero, espejo y caja de mantas', '60cd4155-59e7-4f0d-bb68-5d90a9f28ce1'),
  ('Limpiar cajones de la barra', '516ed4e3-07d5-438d-9f06-97f6ebdf5543')
) AS u(title, user_id) ON u.title = a.title
ON CONFLICT (activity_id, user_id) DO NOTHING;
