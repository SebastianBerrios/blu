# E2E tests (Playwright)

Tests E2E contra un proyecto Supabase **separado** (no producción). Ver
`security-audit-2026-05-04.md` y discusión de tests para el contexto.

## Setup inicial (una sola vez)

1. Crea un proyecto Supabase nuevo en https://supabase.com/dashboard llamado
   `blu-test` (free tier).
2. Aplica al proyecto de test las mismas migrations del proyecto productivo
   (incluyendo las del audit de seguridad). Hoy esto se hace via Supabase MCP
   apuntando a la ref del proyecto de test.
3. Crea un test user con rol `admin`:
   - Auth → Users → "Add user" → email `admin@blu-test.local` + password.
   - SQL editor: `UPDATE user_profiles SET role='admin' WHERE id='<uuid del user>';`
4. Seed mínimo de catálogo (1 categoría + 1 producto):
   ```sql
   INSERT INTO categories (name, tipo) VALUES ('Bebidas', 'bebida') RETURNING id;
   -- usa el id retornado abajo:
   INSERT INTO products (name, category_id, price, is_available)
   VALUES ('Latte', <category_id>, 12, true);
   ```
5. Copia `.env.test.local.example` a `.env.test.local` y completa los valores.

## Correr tests

```bash
pnpm test:e2e              # headless
pnpm test:e2e:ui           # con UI interactiva
pnpm test:e2e:debug        # con debugger
```

Los tests asumen que existe al menos:
- 1 admin user (credenciales en `.env.test.local`)
- 1 categoría
- 1 producto llamado "Latte"

## Estructura

- `fixtures.ts` — fixture `adminPage` que loguea como admin antes de cada test.
- `01-sale-flow.spec.ts` — flujo crítico de venta (crear, entregar, editar,
  eliminar). El test de "editar con item Entregado" es la regresión del bug
  fix `07f4486`.
