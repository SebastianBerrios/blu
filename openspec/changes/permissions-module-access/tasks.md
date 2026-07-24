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

- [x] 5.1 RED: Write `src/features/usuarios/permissions/moduleNav.test.ts`. Assert for `isNavItemVisible`: (a) `adminOnly` item → only visible when `isAdmin: true`; (b) mapped configurable item → `can()` false → hidden; (c) mapped configurable item → `can()` true → visible; (d) unmapped item → always visible; (e) admin `isAdmin: true` → all mapped items visible regardless of `can()` (branch-1). Run `pnpm test` — expect failures (file doesn't exist yet).
- [x] 5.2 Create `src/features/usuarios/permissions/moduleNav.ts`: export `NAV_MODULE_KEY` (10-entry `Record<string, PermissionKey>`) and `isNavItemVisible(item, ctx)` as per ADR-3. No React, no hooks. Run `pnpm test` — expect all assertions to pass (GREEN).

### Phase 6: Nav wiring

- [x] 6.1 In `src/components/SideBar/index.tsx` (or equivalent): call `usePermissions()` alongside `useAuth()`; replace the current `!item.adminOnly || isAdmin` filter with `isNavItemVisible(item, { isAdmin, can })`. Verify sensitive items still admin-only, configurable items use `can()`. No flash: `isLoading` state handled (items render stable; skeleton or full list, not flickering — S3.3-a).
- [x] 6.2 In `src/components/ui/BottomNav/` (and `BottomSheet` if applicable): same — import `isNavItemVisible`, pass `{ isAdmin, can }`. Use `item.href` as the path accessor (adapt if needed per ADR-3 note). Verify S3.1-a, S3.2-a/b/c/d.

### Phase 7: Page guards (~10 pages)

- [x] 7.1 `src/app/categories/page.tsx`: add `const { can, isLoading } = usePermissions(); if (!isLoading && !can("module.categories")) redirect("/");` (mirrors finanzas pattern). Acceptance: S4.1-a/d/e.
- [x] 7.2 `src/app/products/page.tsx`: same guard, key `module.products`.
- [x] 7.3 `src/app/ingredients/page.tsx`: replace existing `isAdmin` redirect with `can("module.ingredients")` guard. Default-OFF seed preserves admin-only day one (S4.2-a/b).
- [x] 7.4 `src/app/recipes/page.tsx`: replace `isAdmin` redirect with `can("module.recipes")` guard (same rationale as 7.3).
- [x] 7.5 `src/app/sales/page.tsx`: add `can("module.sales")` guard.
- [x] 7.6 `src/app/pedidos/page.tsx`: add `can("module.pedidos")` guard.
- [x] 7.7 `src/app/compras/page.tsx`: add `can("module.compras")` guard.
- [x] 7.8 `src/app/inventario/page.tsx`: add `can("module.inventario")` guard.
- [x] 7.9 `src/app/horario/page.tsx`: add `can("module.horario")` guard.
- [x] 7.10 `src/app/actividades/page.tsx`: add `can("module.actividades")` guard. Verify S4.1-b/c (force-OFF redirects).

### Phase 8: Middleware

- [x] 8.1 In `src/utils/supabase/middleware.ts`: after `auth.getUser()`, add the `SENSITIVE_PREFIXES` guard block (ADR-5 code). After prefix match, query `user_profiles.select("role").eq("id", user.id).single()`; if `profile?.role !== "admin"` redirect to `/`. Preserve `supabaseResponse` cookie on all other paths. Verify S5.1-a/b/c/d/e, S5.2-a, S5.3-a.
- [ ] 8.2 Manual smoke-test: non-admin GET `/finanzas` → 302 to `/`; admin GET `/finanzas` → 200. Non-admin GET `/sales` → no middleware redirect (page guard handles). Unauthenticated GET `/sales` → `/login` (unchanged).

---

## PR3 — Area C: Financial RLS (security-critical)

> REQ-6, REQ-7, REQ-9 | Sequencing inside PR3 is load-bearing: RPC+rewire BEFORE SELECT restriction.
> Recommend security-auditor + judgment-day review before merge.

### Phase 9: get_payment_accounts RPC

- [x] 9.1 DONE BY ORCHESTRATOR — RPC already created in DB before this apply run.
- [x] 9.2 DONE BY ORCHESTRATOR — Verified: returns {id,type,name} only, no balance column.
- [x] 9.3 Migration file created: `supabase/migrations/20260723T04_get_payment_accounts_rpc.sql` (for repo reproducibility; NOT applied — already in DB).

### Phase 10: Regen database.ts + usePaymentAccounts hook

- [x] 10.1 Regenerated `src/types/database.ts` via `npx supabase@latest gen types typescript --project-id guicntncdiygxullmfil`. Confirmed `get_payment_accounts` appears at line 1403 with `Returns: { id: number; name: string; type: string }[]`.
- [x] 10.2 Created `src/hooks/usePaymentAccounts.ts`: SWR hook calling `supabase.rpc("get_payment_accounts")`, exporting `PaymentAccount = { id: number; type: string; name: string }` and convenience accessors (cajaAccount, bancoAccount, rappiAccount, posAccount). Standard SWR config. `useAccounts.ts` NOT modified.

### Phase 11: Rewire non-admin payment flows

- [x] 11.1 `src/components/forms/PaymentModal/index.tsx`: replaced `useAccounts()` with `usePaymentAccounts()`. No `.balance` read. Accessors (cajaAccount, bancoAccount, rappiAccount, posAccount, accountsLoading) same shape.
- [x] 11.2 `src/components/forms/SaleForm/index.tsx`: replaced `useAccounts()` with `usePaymentAccounts()`. Services only receive account IDs (`.id` extracts), no balance.
- [x] 11.3 `src/components/forms/PurchaseForm/index.tsx`: replaced `useAccounts()` with `usePaymentAccounts()`. `usePurchaseFormInit` receives `cajaAccount?.id` (number) — unchanged signature.
- [x] 11.4 `src/features/compras/components/AccountSelector.tsx`: updated import from `Account` to `PaymentAccount` type — prop shape `{ id, type, name }` matches. No `.balance` read anywhere in component. Admin-only banco button still gated by `isAdmin` prop.
- [ ] 11.5 MCP scenario: manual verify — non-admin opens PaymentModal → accounts populate from RPC → payment submits successfully (pending orchestrator manual smoke-test).

### Phase 12: Restrict transactions and accounts SELECT

- [ ] 12.1 Use MCP `execute_sql`: `DROP POLICY IF EXISTS authenticated_read_transactions ON public.transactions; CREATE POLICY transactions_admin_read ON public.transactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role='admin'));`
- [ ] 12.2 Use MCP `execute_sql`: `DROP POLICY IF EXISTS authenticated_read_accounts ON public.accounts; CREATE POLICY accounts_admin_read ON public.accounts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role='admin'));`
- [ ] 12.3 MCP verify: non-admin authenticated `SELECT * FROM transactions LIMIT 1` → 0 rows (S6.1-a). Admin → rows returned (S6.1-b). Non-admin `SELECT * FROM accounts LIMIT 1` → 0 rows (S7.3-a). Admin → rows with balance (S7.3-b).
- [ ] 12.4 MCP verify: `record_transaction` RPC call by a non-admin (simulate via RPC tool) → succeeds (SECURITY DEFINER bypasses SELECT restriction — S6.1-c).
- [ ] 12.5 Commit the two RLS-restriction migrations: `supabase db pull <name> --local --yes`. Verify list.
- [ ] 12.6 Manual verify: admin navigates to `/finanzas` → account balances render (S7.3-c). Estadisticas admin page loads normally (S9.3-a).
