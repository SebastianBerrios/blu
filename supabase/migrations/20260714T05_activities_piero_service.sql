-- Give Piero (cocinero) service/jornada support tasks so his load matches the
-- others. Shared with the current owners. Idempotent.
--   24 Preparar comidas saladas del menú        (con Juanjo)
--    9 Emplatar comidas saladas y dulces         (con Juanjo)
--   11 Lavar menaje usado                        (con Juanjo)
--   26 Recolectar vajilla sucia de mesas (alto flujo) (con Alessandro)
INSERT INTO public.activity_assignments (activity_id, user_id)
VALUES
  (24, '46c5bda4-cca0-4342-a6cc-2e1042868138'),
  (9,  '46c5bda4-cca0-4342-a6cc-2e1042868138'),
  (11, '46c5bda4-cca0-4342-a6cc-2e1042868138'),
  (26, '46c5bda4-cca0-4342-a6cc-2e1042868138')
ON CONFLICT (activity_id, user_id) DO NOTHING;
