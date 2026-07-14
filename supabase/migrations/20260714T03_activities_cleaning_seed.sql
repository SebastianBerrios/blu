-- Seed: detailed cleaning activities per zone (kitchen, dining room, bathroom,
-- patio, bar) + "turn off equipment/lights" and "clean gas stove". Idempotent:
-- only inserts activities whose title does not already exist.
--
-- Assignees (by zone responsibility):
--   Juanjose Perez (cocinero) 60cd4155-59e7-4f0d-bb68-5d90a9f28ce1 → cocina, salón interior, baño
--   Alessandro Vega (barista) 516ed4e3-07d5-438d-9f06-97f6ebdf5543 → barra, patio
--   "Apagar equipos y luces al cierre" → compartida (ambos)

WITH payload(title, description, category, frequency, days_of_week, sort_order) AS (
  VALUES
    ('Limpiar mesas de acero inoxidable (todos los niveles)'::text,
     'Limpia y desinfecta las superficies y TODOS los niveles de las mesas de acero (tope y repisas inferiores); retira lo que esté encima y déjalas despejadas.'::text,
     'cierre'::text, 'daily'::text, NULL::smallint[], 20::int),
    ('Limpiar el pozo/lavadero de la cocina',
     'Lava el pozo por dentro y la grifería, retira los restos de la rejilla del desagüe y desinfecta; deja la poza seca.',
     'cierre', 'daily', NULL::smallint[], 21),
    ('Limpiar la cocina a gas y guardar ollas y sartenes',
     'Retira ollas y sartenes, quita el papel aluminio, desengrasa hornillas y parrillas, y guarda todo en su lugar.',
     'cierre', 'daily', NULL::smallint[], 22),
    ('Limpiar paredes y mayólicas de la cocina',
     'Limpia mayólicas y paredes de la cocina eliminando grasa y salpicaduras, sobre todo detrás de la cocina a gas y del lavadero.',
     'cierre', 'weekly', ARRAY[4]::smallint[], 30),
    ('Limpiar campana extractora y filtros',
     'Desengrasa la campana por dentro y por fuera y lava los filtros metálicos.',
     'cierre', 'weekly', ARRAY[4]::smallint[], 31),
    ('Limpiar por fuera los equipos (horno, microondas, licuadora y refrigeradora)',
     'Limpia por fuera horno, microondas, licuadora y refrigeradora, incluidas puertas y manijas.',
     'cierre', 'weekly', ARRAY[4]::smallint[], 32),
    ('Ordenar y limpiar repisas y estantes de insumos',
     'Baja los insumos, limpia repisas y estantes, y vuelve a ordenar rotulado y por fecha (PEPS).',
     'cierre', 'weekly', ARRAY[4]::smallint[], 33),
    ('Limpiar paredes, zócalos y ventanas del salón interior',
     'Limpia paredes, zócalos de madera y ventanas del salón interior; retira marcas y polvo.',
     'cierre', 'weekly', ARRAY[4]::smallint[], 34),
    ('Limpieza profunda del baño',
     'Lava inodoro, lavatorio, mayólicas y piso; desinfecta, y repone papel, jabón y bolsa del tacho.',
     'cierre', 'weekly', ARRAY[4]::smallint[], 35),
    ('Limpiar el pozo/lavadero de la barra',
     'Lava el pozo de la barra y la grifería, retira borras y restos, y desinfecta; deja la zona seca.',
     'cierre', 'daily', NULL::smallint[], 23),
    ('Limpiar vidrios de la vitrina, puertas y ventanas del patio',
     'Limpia por dentro y por fuera los vidrios de la vitrina, las puertas y las ventanas del patio.',
     'cierre', 'weekly', ARRAY[5]::smallint[], 36),
    ('Regar y limpiar las plantas del patio',
     'Riega las plantas del patio, retira hojas secas y limpia el polvo de las macetas.',
     'apertura', 'weekly', ARRAY[5]::smallint[], 20),
    ('Apagar equipos y luces al cierre',
     'Apaga y desconecta máquina de café, licuadora, horno y TV; apaga las luces del patio y del local antes de salir.',
     'cierre', 'daily', NULL::smallint[], 40)
),
ins AS (
  INSERT INTO public.activities (title, description, category, frequency, days_of_week, sort_order)
  SELECT p.title, p.description, p.category, p.frequency, p.days_of_week, p.sort_order
  FROM payload p
  WHERE NOT EXISTS (SELECT 1 FROM public.activities a WHERE a.title = p.title)
  RETURNING id, title
),
asgn(title, user_id) AS (
  VALUES
    ('Limpiar mesas de acero inoxidable (todos los niveles)'::text, '60cd4155-59e7-4f0d-bb68-5d90a9f28ce1'::uuid),
    ('Limpiar el pozo/lavadero de la cocina', '60cd4155-59e7-4f0d-bb68-5d90a9f28ce1'),
    ('Limpiar la cocina a gas y guardar ollas y sartenes', '60cd4155-59e7-4f0d-bb68-5d90a9f28ce1'),
    ('Limpiar paredes y mayólicas de la cocina', '60cd4155-59e7-4f0d-bb68-5d90a9f28ce1'),
    ('Limpiar campana extractora y filtros', '60cd4155-59e7-4f0d-bb68-5d90a9f28ce1'),
    ('Limpiar por fuera los equipos (horno, microondas, licuadora y refrigeradora)', '60cd4155-59e7-4f0d-bb68-5d90a9f28ce1'),
    ('Ordenar y limpiar repisas y estantes de insumos', '60cd4155-59e7-4f0d-bb68-5d90a9f28ce1'),
    ('Limpiar paredes, zócalos y ventanas del salón interior', '60cd4155-59e7-4f0d-bb68-5d90a9f28ce1'),
    ('Limpieza profunda del baño', '60cd4155-59e7-4f0d-bb68-5d90a9f28ce1'),
    ('Limpiar el pozo/lavadero de la barra', '516ed4e3-07d5-438d-9f06-97f6ebdf5543'),
    ('Limpiar vidrios de la vitrina, puertas y ventanas del patio', '516ed4e3-07d5-438d-9f06-97f6ebdf5543'),
    ('Regar y limpiar las plantas del patio', '516ed4e3-07d5-438d-9f06-97f6ebdf5543'),
    ('Apagar equipos y luces al cierre', '516ed4e3-07d5-438d-9f06-97f6ebdf5543'),
    ('Apagar equipos y luces al cierre', '60cd4155-59e7-4f0d-bb68-5d90a9f28ce1')
)
INSERT INTO public.activity_assignments (activity_id, user_id)
SELECT ins.id, asgn.user_id
FROM ins
JOIN asgn ON asgn.title = ins.title
ON CONFLICT (activity_id, user_id) DO NOTHING;
