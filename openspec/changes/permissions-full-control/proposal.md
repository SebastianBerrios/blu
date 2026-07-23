# Proposal: permissions-full-control — Phase 1 (Foundation)

> Artifact store: hybrid (openspec file + engram `sdd/permissions-full-control/proposal`).
> Date: 2026-07-23. Reads: exploration.md (authoritative, incl. CORRECTION) + engram `sdd/permissions-full-control/explore` (id 135).
> Scope of THIS proposal: **Phase 1 only.** Module/nav access = Phase 2, field-level = Phase 3.

## Problem statement

Blu already has a role-based permission system (`role_permissions` table, `has_permission()` RPC, `usePermissions()` hook, `PermissionsTab` dashboard), but it has three concrete gaps that block the larger goal of "control ALL app permissions from one admin module":

1. **Coarse granularity.** Permissions are per-role only. An admin cannot grant one specific cocinero the ability to delete sales while denying it to the rest of the cocineros. Real staff situations (a trusted employee, a temporary exception, a person under review) have no expression in the model today — the only workaround is changing the person's role, which over- or under-grants everything else.

2. **Type drift and an invisible permission.** `PermissionKey` is a hand-maintained TS union that must be kept in lockstep with `PERMISSION_DEFS` by hand — a known drift trap. Worse, `purchases.delete` is already enforced in the DB (`delete_purchase_atomic` calls `has_permission`), but it is absent from the TS union, from `PERMISSION_DEFS`, and from the dashboard. The result: a permission is silently gating behavior in production with **zero UI to configure it**. An admin literally cannot see or change who can delete purchases.

3. **No foundation for the full-control vision.** Phases 2 (module/nav access) and 3 (field-level) both depend on a clean, drift-free permission registry and a per-user override mechanism. Without Phase 1, every later phase re-litigates the same storage/resolution decisions.

This is the first formal SDD change on the project, so Phase 1 also establishes the pattern (tri-state overrides, DB+client resolution parity, data-driven roles) that Phases 2 and 3 will extend.

## Goals (Phase 1)

1. **Eliminate type drift** — derive `PermissionKey` from `PERMISSION_DEFS` so the type and the registry can never diverge.
2. **Surface `purchases.delete`** — add it to `PERMISSION_DEFS` (group "Compras") so the already-DB-enforced permission becomes visible and configurable.
3. **Introduce per-user overrides** — a new `user_permissions` table with **tri-state** semantics: inherit (no row) / force-ON / force-OFF.
4. **Unify resolution order** — `has_permission()` (DB) and `can()` (client) both resolve: admin short-circuit → user override if a row exists → role default → false.
5. **Service + hook + dashboard** — `setUserPermission()` / `clearUserPermission()` in `permissionsService.ts`; `usePermissions()` fetches both tables and exposes an effective-permission map; `PermissionsTab` gains a data-driven role matrix plus a per-user override sub-view with a tri-state control.
6. **Preserve the admin security invariant** — admin is always-all via the `user_profiles.role='admin'` short-circuit, NEVER via a permission table row. No override, role default, or `user_permissions` row can grant OR revoke an admin's access.

## Non-goals (explicitly out of Phase 1)

- **Module/page access gating** (converting page redirects and `adminOnly` nav flags into `module.*` permission keys) → **Phase 2.**
- **Field-level control** (`products.manufacturing_cost`, `categories.target_margin`, `purchases.account_id` as `field.*` keys) → **Phase 3.**
- **Migrating existing hardcoded `isAdmin` gates** in categories/products/horario/actividades to `can()` → later phases; Phase 1 does not touch these call sites.
- **Adding NEW permission keys** beyond the 7 already wired to `can()`/RPC. Phase 1 surfaces `purchases.delete` (already enforced) — it does not invent keys for behaviors that aren't yet gated.
- **No security hotfix.** VERIFIED against the live DB: `discard_inventory`, `produce_recipe_batch`, `adjust_inventory_manual`, and `reverse_production` already call `has_permission(...)` with `RAISE EXCEPTION`. The earlier "critical gap" claim is retracted — there is nothing to patch.
- **Tightening the known RLS gap** (any authenticated user can `UPDATE ingredients` directly via PostgREST; column control is UI-only). This is the documented current model, not a regression; whether to close it is a Phase 3 decision.

## Approach (Phase 1)

### Permission registry (types)
- Add `purchases.delete` to `PERMISSION_DEFS` under a new group `"Compras"`; extend `PermissionGroup` to include it.
- Replace the hand-maintained union with `export type PermissionKey = (typeof PERMISSION_DEFS)[number]["key"]`. This makes the array the single source of truth (mirrors the existing `TransactionType ↔ CHECK constraints in lockstep` lesson, but enforced by the compiler instead of by discipline).
- Phase 1 registry = **7 keys**: `sales.edit_any_date`, `sales.delete`, `inventory.adjust_stock`, `inventory.discard`, `inventory.produce`, `inventory.view_history`, `purchases.delete`.

### `user_permissions` table (design intent — exact SQL deferred to design phase)
- Columns: `user_id uuid` (FK → `user_profiles.id`), `permission text`, `enabled boolean` (true = force-ON, false = force-OFF), `updated_at timestamptz`, `updated_by uuid`.
- **PK `(user_id, permission)`** — one override row per user+permission; absence of a row = "inherit from role".
- **Tri-state is encoded by row presence + `enabled`:** no row → inherit; row with `enabled=true` → force-ON; row with `enabled=false` → force-OFF. Setting a cell back to "inherit" **deletes** the row (not `enabled=null`), keeping the table sparse and the resolution logic a clean 3-branch.
- **RLS (consistent with CLAUDE.md security model):**
  - SELECT: a user may read their own rows (`user_id = auth.uid()`); admin reads all.
  - INSERT/UPDATE/DELETE: admin-only (`EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role='admin')`), matching how `role_permissions` writes are gated.
  - RLS enabled on the table (public schema, reachable via PostgREST).
- Consider an index supporting the client fetch of one user's overrides (the PK already covers `user_id` as the leading column, so a lookup by `user_id` is index-served — likely no extra index needed; design phase confirms).

### `has_permission(p_permission, p_user_id)` resolution order (DB)
Update the function body to the exact 4-branch order, preserving the admin invariant as branch 1:
```
1. if user is admin (user_profiles.role='admin')            → TRUE      (invariant — never data-driven)
2. else if a user_permissions row exists for (user, perm)   → that row's enabled
3. else if a role_permissions row exists for (role, perm)   → that row's enabled
4. else                                                     → FALSE
```
Keep `SECURITY DEFINER`, `SET search_path = public, pg_temp`, and existing grants unchanged. Branch 2 must check row EXISTENCE, not just `enabled`, so a force-OFF (`enabled=false`) row correctly overrides a permissive role default.

### Client resolution (`usePermissions()` hook)
- Fetch `role_permissions` (as today) AND the current user's `user_permissions` rows (`user_id = auth.uid()`), using standard SWR config.
- Compute an `effectivePermissions` map once per data change (derived during render / memoized, not via effect — per vercel-react-best-practices `rerender-derived-state-no-effect`).
- `can(key)` mirrors the DB's 4-branch order exactly. This is the **critical parity requirement**: the UI must not show an action as available that the DB will then reject (or vice-versa).
- Keep the existing `can()` signature so current call sites keep working unchanged.

### Service layer (`permissionsService.ts`, <150 LOC)
- `setUserPermission({ userId, permission, enabled, adminId, adminName })` — upsert into `user_permissions` on conflict `(user_id, permission)`; `logAudit` on success; throw on error. Mirrors `setRolePermission()` exactly (same audit action `cambiar_permiso`, `targetTable: "user_permissions"`, `targetId: "{userId}:{permission}"`).
- `clearUserPermission({ userId, permission, adminId, adminName })` — DELETE the override row (the "inherit" case); `logAudit`; throw on error.
- No `createClient()` in components — writes flow component → service → Supabase.

### Dashboard (`PermissionsTab.tsx`)
- **Role matrix, data-driven:** derive the configurable role columns from the distinct non-admin roles present in the system (today cocinero/barista) rather than the hardcoded `CONFIGURABLE_ROLES` literal, so a future role appears automatically. Admin column stays "Siempre" (never a toggle).
- **Per-user override sub-view:** a user selector; on selecting a user, show that user's effective permission per key with a **tri-state control** (Inherit / On / Off). "Inherit" calls `clearUserPermission`; On/Off call `setUserPermission`. Show the inherited (role) value as the baseline so the admin sees what "inherit" resolves to.
- Follow project form/UI conventions: Spanish UI copy, mobile-first stacked rows with `sm:` desktop layout, ≥44px tap targets, `toast` for feedback, error state (no `alert()`).
- **Size risk:** the current `PermissionsTab` is ~165 LOC. Adding a user-override sub-view will push it past the 300-LOC component limit. Plan to **decompose** into `RoleMatrix`, `UserOverridePanel`, and a shared `TriStateControl`/`Toggle` under `src/features/usuarios/components/permissions/`, keeping each file within limits. (Design phase finalizes the split.)

## Affected files

| File | Change |
|------|--------|
| `src/types/permissions.ts` | Add `purchases.delete` + `"Compras"` group; derive `PermissionKey` from `PERMISSION_DEFS`; add `UserPermission` type (`Tables<"user_permissions">`). |
| `src/types/database.ts` | Regenerate after `user_permissions` table is created (auto-generated). |
| `src/features/usuarios/services/permissionsService.ts` | Add `setUserPermission()` + `clearUserPermission()`. |
| `src/features/usuarios/services/permissionsService.test.ts` | Add tests for the two new functions (TDD). |
| `src/hooks/usePermissions.ts` | Fetch `user_permissions`; build `effectivePermissions`; 4-branch `can()`. |
| `src/features/usuarios/components/PermissionsTab.tsx` | Redesign → data-driven role matrix + user-override sub-view (likely decomposed into sub-components). |
| `src/features/usuarios/index.ts` | Export new service functions. |
| DB (new migration) | `CREATE TABLE user_permissions` + RLS policies; `CREATE OR REPLACE FUNCTION has_permission` with 4-branch resolution. |

## Security invariants (must hold after Phase 1)

1. **Admin is always-all via `role='admin'` short-circuit only.** No `user_permissions` or `role_permissions` row can grant or revoke an admin. Branch 1 runs before any table lookup on both DB and client.
2. **`user_permissions` writes are admin-only** (RLS), matching `role_permissions`. A non-admin cannot self-grant by writing their own override row.
3. **DB is the enforcement boundary for DB-gated actions** (`sales.delete`, `purchases.delete`, inventory `adjust/discard/produce`). The client `can()` is UX only; the RPC `has_permission` is authoritative. Parity between the two is a correctness goal, not a security boundary.
4. **`has_permission` stays `SECURITY DEFINER` with `SET search_path`** and REVOKE from anon — no privilege regression.
5. Force-OFF must actually deny: a `user_permissions` row with `enabled=false` overrides a permissive role default (branch 2 checks existence).

## Testing strategy (Strict TDD active — runner: `pnpm test`, vitest)

**Unit-testable (write tests FIRST, red → green):**
- `setUserPermission()` — upsert shape (table `user_permissions`, conflict `user_id,permission`), payload (`enabled`, `updated_by`, ISO `updated_at`), `logAudit` fires with `cambiar_permiso` on success, `logAudit` NOT called on error, error propagates, `adminId=null` edge. Mirror the existing `setRolePermission` test suite (`makeMockSupabase`).
- `clearUserPermission()` — deletes from `user_permissions` filtered by `user_id` + `permission`, `logAudit` fires, error propagates.
- **Client `can()` resolution order** — extract the resolution into a pure, testable function (e.g. `resolvePermission(perm, { isAdmin, role, rolePerms, userPerms })`) so the 4-branch order is unit-tested without React: admin→true regardless of rows; user force-ON over role false; user force-OFF over role true; no user row → role default; no rows → false. This is the highest-value unit test because it guards the parity invariant.
- `PermissionKey` derivation — a type-level assertion / compile check that `purchases.delete` is a member (guards drift).

**Integration-only (flag the coverage gap):**
- The `has_permission` **SQL** resolution cannot be exercised by vitest (no DB in unit env). Coverage gap: the DB side of the 4-branch order is not unit-tested.
  - Mitigation: verify it via a Supabase MCP `execute_sql` scenario during apply/verify (seed a role_permission + a user_permission force-OFF, call `has_permission` as that user, assert false; flip to force-ON, assert true; admin user asserts true with no rows). Document these as manual/integration checks in the tasks phase since there is no SQL test harness in the repo.
  - The pure client `resolvePermission` test is the unit-level proxy that keeps DB and client logic honest — but it does not prove the SQL matches. Design phase should keep the two resolution ladders textually identical and cross-referenced in comments.

## Risks

- **Client/DB resolution drift.** Two implementations of the same 4-branch order can diverge over time. Mitigation: extract client logic into one pure function, mirror comment-for-comment with the SQL, and cover both with the scenarios above. (No shared source of truth is possible across TS and SQL — this is inherent.)
- **Dashboard exceeds the 300-LOC component limit.** Adding the user-override sub-view will overflow `PermissionsTab`. Mitigation: decompose into sub-components (planned in Approach). If not decomposed, it becomes a new god component — flag hard-stop at design.
- **`purchases.delete` behavioral surprise.** Surfacing it means admins can now toggle a permission that was previously invisible-and-DB-default. Existing `role_permissions` rows may or may not have a row for it; verify current DB default so turning the dashboard on doesn't silently change who can delete purchases. (Confirm during apply.)
- **`database.ts` regeneration ordering.** The table must exist before types regenerate; the type-derivation and service work depends on the generated `Tables<"user_permissions">`. Sequencing handled in tasks.
- **First SDD change / first per-user override pattern.** Phases 2–3 inherit these decisions; a wrong storage or resolution choice here compounds. Mitigation: the tri-state + row-presence model and the 4-branch order are deliberately minimal and are the same primitives Phases 2/3 will reuse.

## Review Workload Forecast

- **Estimated changed lines:** ~350–450.
  - Types: ~15 LOC.
  - Service (2 functions): ~50 LOC + ~120 LOC tests.
  - Hook rewrite: ~40 LOC + pure resolver ~25 LOC + ~80 LOC resolver tests.
  - Dashboard redesign + decomposition: ~250–350 LOC across 3–4 files (the dominant cost).
  - SQL migration (table + RLS + function): ~60 LOC (not counted toward the TS 400-line budget but part of review).
- **Exceeds 400 changed lines?** **Borderline / likely yes** once the dashboard decomposition and tests are included.
- **Chaining recommended?** **Yes.** This is the first slice of a chained-PR delivery. Recommended split within Phase 1 if the single PR risks exceeding budget:
  1. **PR 1 — Foundation (backend + non-UI):** `user_permissions` table + RLS, `has_permission` 4-branch update, types (derive `PermissionKey` + add `purchases.delete`), service functions + tests, hook + pure resolver + tests. Ships enforcement and logic; no visible UI change beyond `purchases.delete` appearing.
  2. **PR 2 — Dashboard:** role matrix (data-driven) + user-override sub-view + decomposition. Pure UI on top of PR 1.
- **Decision needed before apply:** **Yes** — confirm the delivery/chain strategy at the Review Workload Guard, since the dashboard portion is the largest single-file UI effort in the change.

## Open questions carried into spec/design

1. Exact `user_permissions` DDL + whether any supporting index beyond the PK is warranted.
2. Final dashboard decomposition boundaries (which sub-components, where the user selector lives relative to the role matrix).
3. Current DB default for `purchases.delete` in `role_permissions` (confirm before surfacing it changes nothing unexpectedly).
4. Whether to keep `CONFIGURABLE_ROLES` as a fallback or fully derive roles from live data (and from which query — distinct `user_profiles.role` vs a roles table).
