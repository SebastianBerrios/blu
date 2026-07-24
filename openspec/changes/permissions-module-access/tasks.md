# Tasks: permissions-module-access (Fase 2 — Module Access)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550–700 (registry+seed+dashboard+nav+10 pages+middleware+RPC+hook+4 rewires+tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 (Area A) → PR2 (Area B) → PR3 (Area C) |
| Delivery strategy | stacked-to-main (3 autonomous slices, each merges to main before next) |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Registry + seed + dashboard grouping (behavior-neutral) | PR1 | Deploy seed to DB BEFORE PR2 enforcement ships |
| 2 | Nav resolver + page guards + middleware (enforcement) | PR2 | Depends on PR1 seed in production |
| 3 | get_payment_accounts RPC + hook + rewiring + RLS restriction | PR3 | Security-auditor + judgment-day review before merge |

---

## PR1 — Area A: Registry, Seed, Dashboard (behavior-neutral)

> REQ-1, REQ-2, REQ-10 | No enforcement yet — safe to deploy without access loss.

### Phase 1: Registry extension

- [x] 1.1 In `src/types/permissions.ts` line 7: add `"Módulos"` to the `PermissionGroup` union.
- [x] 1.2 In `src/types/permissions.ts`: add `level: "module" | "action" | "field"` to the `PermissionDef` interface.
- [x] 1.3 In `PERMISSION_DEFS`: set `level: "action"` on each of the 7 existing entries.
- [x] 1.4 Append 10 `module.*` defs (`module.categories` through `module.actividades`), each with `group: "Módulos"`, `level: "module"`, and a `"Permite abrir el módulo de X."` description. Do not add `module.finanzas`, `module.estadisticas`, `module.auditoria`, or `module.users`. Verify `PermissionKey` union and `PERMISSION_GROUPS` pick up both additions automatically (no manual edit).

### Phase 2: Registry-integrity test (RED → GREEN, Strict TDD)

- [x] 2.1 RED: Write `src/features/usuarios/permissions/__tests__/registry.test.ts`. Assert: (a) exactly 10 `module.*` keys exist, all `level:"module"` and `group:"Módulos"`; (b) existing 7 defs all have `level:"action"`; (c) `PERMISSION_GROUPS` includes `"Módulos"`; (d) sensitive module keys (`module.finanzas` etc.) are absent. Run `pnpm test` — expect failures.
- [x] 2.2 GREEN: Tasks 1.1–1.4 must already be done; run `pnpm test` — expect all registry assertions to pass.

### Phase 3: Seed migration

- [x] 3.1 DONE BY ORCHESTRATOR — seed migration `supabase/migrations/20260723T03_seed_module_permission_defaults.sql` applied and committed.
- [x] 3.2 DONE BY ORCHESTRATOR — verified: cocinero module.sales=true, module.ingredients=false; admin=true via branch-1.
- [x] 3.3 DONE BY ORCHESTRATOR — migration committed to repo.
- [x] 3.4 DONE BY ORCHESTRATOR — has_permission checks verified.

### Phase 4: Dashboard grouping

- [x] 4.1 In `src/features/usuarios/components/permissions/RoleMatrix.tsx`: added `GROUP_HEADING` map and distinct section heading for `level: "module"` defs ("Acceso a módulos") with primary-50 bg and primary-700 text, visually separated from action groups (S10.1-a). File under 300 LOC.
- [x] 4.2 In `src/features/usuarios/components/permissions/UserOverridePanel.tsx`: same heading treatment with primary-color section box so module overrides render under "Acceso a módulos" label (S10.1-b). Tri-state toggles for `module.*` keys work via existing mechanism (S10.1-c).

---

## PR2 — Area B: Nav Resolver, Page Guards, Middleware (enforcement)

> REQ-3, REQ-4, REQ-5, REQ-8 | Depends on PR1 seed being applied to production DB.

### Phase 5: Pure nav resolver (RED → GREEN, Strict TDD)

- [ ] 5.1 RED: Write `src/features/usuarios/permissions/__tests__/moduleNav.test.ts`. Assert for `isNavItemVisible`: (a) `adminOnly` item → only visible when `isAdmin: true`; (b) mapped configurable item → `can()` false → hidden; (c) mapped configurable item → `can()` true → visible; (d) unmapped item → always visible; (e) admin `isAdmin: true` → all mapped items visible regardless of `can()` (branch-1). Run `pnpm test` — expect failures (file doesn't exist yet).
- [ ] 5.2 Create `src/features/usuarios/permissions/moduleNav.ts`: export `NAV_MODULE_KEY` (10-entry `Record<string, PermissionKey>`) and `isNavItemVisible(item, ctx)` as per ADR-3. No React, no hooks. Run `pnpm test` — expect all assertions to pass (GREEN).

### Phase 6: Nav wiring

- [ ] 6.1 In `src/components/SideBar/index.tsx` (or equivalent): call `usePermissions()` alongside `useAuth()`; replace the current `!item.adminOnly || isAdmin` filter with `isNavItemVisible(item, { isAdmin, can })`. Verify sensitive items still admin-only, configurable items use `can()`. No flash: `isLoading` state handled (items render stable; skeleton or full list, not flickering — S3.3-a).
- [ ] 6.2 In `src/components/ui/BottomNav/` (and `BottomSheet` if applicable): same — import `isNavItemVisible`, pass `{ isAdmin, can }`. Use `item.href` as the path accessor (adapt if needed per ADR-3 note). Verify S3.1-a, S3.2-a/b/c/d.

### Phase 7: Page guards (~10 pages)

- [ ] 7.1 `src/app/categories/page.tsx`: add `const { can, isLoading } = usePermissions(); if (!isLoading && !can("module.categories")) redirect("/");` (mirrors finanzas pattern). Acceptance: S4.1-a/d/e.
- [ ] 7.2 `src/app/products/page.tsx`: same guard, key `module.products`.
- [ ] 7.3 `src/app/ingredients/page.tsx`: replace existing `isAdmin` redirect with `can("module.ingredients")` guard. Default-OFF seed preserves admin-only day one (S4.2-a/b).
- [ ] 7.4 `src/app/recipes/page.tsx`: replace `isAdmin` redirect with `can("module.recipes")` guard (same rationale as 7.3).
- [ ] 7.5 `src/app/sales/page.tsx`: add `can("module.sales")` guard.
- [ ] 7.6 `src/app/pedidos/page.tsx`: add `can("module.pedidos")` guard.
- [ ] 7.7 `src/app/compras/page.tsx`: add `can("module.compras")` guard.
- [ ] 7.8 `src/app/inventario/page.tsx`: add `can("module.inventario")` guard.
- [ ] 7.9 `src/app/horario/page.tsx`: add `can("module.horario")` guard.
- [ ] 7.10 `src/app/actividades/page.tsx`: add `can("module.actividades")` guard. Verify S4.1-b/c (force-OFF redirects).

### Phase 8: Middleware

- [ ] 8.1 In `src/utils/supabase/middleware.ts`: after `auth.getUser()`, add the `SENSITIVE_PREFIXES` guard block (ADR-5 code). After prefix match, query `user_profiles.select("role").eq("id", user.id).single()`; if `profile?.role !== "admin"` redirect to `/`. Preserve `supabaseResponse` cookie on all other paths. Verify S5.1-a/b/c/d/e, S5.2-a, S5.3-a.
- [ ] 8.2 Manual smoke-test: non-admin GET `/finanzas` → 302 to `/`; admin GET `/finanzas` → 200. Non-admin GET `/sales` → no middleware redirect (page guard handles). Unauthenticated GET `/sales` → `/login` (unchanged).

---

## PR3 — Area C: Financial RLS (security-critical)

> REQ-6, REQ-7, REQ-9 | Sequencing inside PR3 is load-bearing: RPC+rewire BEFORE SELECT restriction.
> Recommend security-auditor + judgment-day review before merge.

### Phase 9: get_payment_accounts RPC

- [ ] 9.1 Use MCP `execute_sql` to create the RPC: `CREATE OR REPLACE FUNCTION public.get_payment_accounts() RETURNS TABLE (id bigint, type text, name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$ SELECT a.id, a.type, a.name FROM public.accounts a ORDER BY a.id; $$;` Then `REVOKE EXECUTE ON FUNCTION public.get_payment_accounts() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION public.get_payment_accounts() TO authenticated;`
- [ ] 9.2 MCP verify: authenticated non-admin `SELECT * FROM get_payment_accounts()` → rows with `{id,type,name}` only, no `balance` column (S7.1-a). Anon call → permission error (S7.1-b). Admin call → same rows (S7.1-c).
- [ ] 9.3 Commit RPC migration: `supabase db pull <name> --local --yes`. Verify `supabase migration list --local`.

### Phase 10: Regen database.ts + usePaymentAccounts hook

- [ ] 10.1 MCP `generate_typescript_types` → overwrite `src/types/database.ts`. Confirm `get_payment_accounts` return type appears in the generated file (required before hook compiles against it).
- [ ] 10.2 Create `src/hooks/usePaymentAccounts.ts`: SWR hook calling `supabase.rpc("get_payment_accounts")`, returning `{ data: PaymentAccount[], error, isLoading, mutate }` with standard SWR config (`revalidateOnFocus: false, revalidateOnReconnect: true, dedupingInterval: 2000`). Type `PaymentAccount = { id: bigint; type: string; name: string }`. Do NOT modify `useAccounts.ts`.

### Phase 11: Rewire non-admin payment flows

- [ ] 11.1 `src/features/ventas/components/PaymentModal.tsx`: replace `useAccounts()` with `usePaymentAccounts()`. Confirm it receives `id`, `type`, `name` — no balance needed. Props/shape to `AccountSelector` unchanged.
- [ ] 11.2 `src/components/forms/SaleForm/` (or `src/features/ventas/`): replace `useAccounts()` with `usePaymentAccounts()` for the account-selection step.
- [ ] 11.3 `src/components/forms/PurchaseForm/` — locate `usePurchaseFormInit` (or equivalent accounts fetch); switch to `usePaymentAccounts()`.
- [ ] 11.4 `src/components/ui/AccountSelector/` (or wherever it lives): confirm it receives `{id, type, name}[]` via props — no internal data fetch that reads balance. Adjust if needed.
- [ ] 11.5 MCP scenario: non-admin authenticated call to `get_payment_accounts()` succeeds AND (manual) non-admin opens PaymentModal → accounts populate → payment submits successfully (S7.2-a, S7.2-b, S9.2-a).

### Phase 12: Restrict transactions and accounts SELECT

- [ ] 12.1 Use MCP `execute_sql`: `DROP POLICY IF EXISTS authenticated_read_transactions ON public.transactions; CREATE POLICY transactions_admin_read ON public.transactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role='admin'));`
- [ ] 12.2 Use MCP `execute_sql`: `DROP POLICY IF EXISTS authenticated_read_accounts ON public.accounts; CREATE POLICY accounts_admin_read ON public.accounts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role='admin'));`
- [ ] 12.3 MCP verify: non-admin authenticated `SELECT * FROM transactions LIMIT 1` → 0 rows (S6.1-a). Admin → rows returned (S6.1-b). Non-admin `SELECT * FROM accounts LIMIT 1` → 0 rows (S7.3-a). Admin → rows with balance (S7.3-b).
- [ ] 12.4 MCP verify: `record_transaction` RPC call by a non-admin (simulate via RPC tool) → succeeds (SECURITY DEFINER bypasses SELECT restriction — S6.1-c).
- [ ] 12.5 Commit the two RLS-restriction migrations: `supabase db pull <name> --local --yes`. Verify list.
- [ ] 12.6 Manual verify: admin navigates to `/finanzas` → account balances render (S7.3-c). Estadisticas admin page loads normally (S9.3-a).
