-- Fase 2 (permissions-module-access) Area A: behavior-neutral seed of module.* defaults.
-- Reproduces today's access exactly: all-role pages ON, admin-only pages (ingredients/recipes) OFF.
-- Admin needs no rows (has_permission branch-1 short-circuit). Idempotent.
-- MUST deploy BEFORE any module enforcement (nav/page/middleware, PR2), or non-admins
-- instantly lose sales/compras/inventario via branch-4 default-deny.
INSERT INTO public.role_permissions (role, permission, enabled) VALUES
  ('cocinero','module.categories',true),
  ('cocinero','module.products',true),
  ('cocinero','module.sales',true),
  ('cocinero','module.pedidos',true),
  ('cocinero','module.compras',true),
  ('cocinero','module.inventario',true),
  ('cocinero','module.horario',true),
  ('cocinero','module.actividades',true),
  ('cocinero','module.ingredients',false),
  ('cocinero','module.recipes',false),
  ('barista','module.categories',true),
  ('barista','module.products',true),
  ('barista','module.sales',true),
  ('barista','module.pedidos',true),
  ('barista','module.compras',true),
  ('barista','module.inventario',true),
  ('barista','module.horario',true),
  ('barista','module.actividades',true),
  ('barista','module.ingredients',false),
  ('barista','module.recipes',false)
ON CONFLICT (role, permission) DO NOTHING;
