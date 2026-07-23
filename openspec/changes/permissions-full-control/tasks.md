# permissions-full-control — Phase 1 Task Checklist

> Change: permissions-full-control (Phase 1 — Foundation)
> Artifact store: hybrid
> Date: 2026-07-23
> Reads: spec.md (id 140) + design.md (id 141)
> Strict TDD: ACTIVE — test runner `pnpm test` (vitest). Every code unit with logic gets its test written FIRST (red → green).
> Delivery: chained PRs — PR1 (Foundation: steps 1–6 + resolver/service barrels) then PR2 (Dashboard: step 7 + component barrel).

---

## Review Workload Forecast

| Slice | Estimated changed lines | 400-line risk | Chained PRs recommended |
|-------|------------------------|---------------|------------------------|
| PR1 — Foundation | ~320 lines | Low (stays under 400) | Yes (by design, not risk) |
| PR2 — Dashboard | ~350 lines | Low | Yes (by design, not risk) |
| Combined if single PR | ~670 lines | High — exceeds 400 | Yes, strongly |

**Decision needed before apply:** No. Chained PR delivery is already chosen per design §7 and the ask-on-risk strategy triggers only when the choice is ambiguous. The split is pre-decided.

---

## PR1 — Foundation (backend + logic)

> Steps 1–6 + resolver/service barrels. Enforcement and logic ship here. Only visible change is `purchases.delete` appearing in the existing role matrix (which reads from `PERMISSION_DEFS`).

---

### Step 1 — DB Migration

**Spec:** 4-Branch Resolution Parity, user_permissions RLS, Admin Security Invariant
**Sequencing:** must complete before any TS work (unblocks step 2)

- [x] **T1.1** — Create migration file via `supabase migration new user_permissions_and_has_permission` to get the correct timestamped filename. Do NOT invent a filename.

- [x] **T1.2** — In the migration SQL, CREATE TABLE `public.user_permissions` with columns: `user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE`, `permission text NOT NULL`, `enabled boolean NOT NULL`, `updated_at timestamptz NOT NULL DEFAULT now()`, `updated_by uuid` (nullable), `PRIMARY KEY (user_id, permission)`. Enable RLS immediately after.
  - **Acceptance:** `\d user_permissions` shows correct schema; `psql` or MCP `list_tables` confirms.

- [x] **T1.3** — Write the 4 RLS policies on `user_permissions`: SELECT (own rows OR admin), INSERT admin-only WITH CHECK, UPDATE admin-only (USING + WITH CHECK), DELETE admin-only. Use `(SELECT auth.uid())` wrapping (init-plan pattern) in every policy. Do NOT add a standalone index (PK composite serves `WHERE user_id = ?`).
  - **Acceptance:** Non-admin SELECT returns only own rows; admin-read-all; non-admin INSERT rejected.

- [x] **T1.4** — `CREATE OR REPLACE FUNCTION public.has_permission(p_permission text, p_user_id uuid DEFAULT auth.uid())` — LANGUAGE sql, STABLE, SECURITY DEFINER, SET search_path = public, pg_temp. Implement the 4-branch CASE exactly as in design §4: branch 1 admin EXISTS → true; branch 2 user_permissions row EXISTS → enabled (existence check, not COALESCE); branch 3 role_permissions row EXISTS → enabled; branch 4 → false. Add the cross-reference comment block naming `permissionsResolver.ts`.
  - **CRITICAL:** keep `DEFAULT auth.uid()` — single-argument callers (`discard_inventory`, `produce_recipe_batch`, `adjust_inventory_manual`, `reverse_production`, `delete_sale_atomic`, `delete_purchase_atomic`) rely on it.
  - **Acceptance:** Function compiles; signature shows `DEFAULT auth.uid()` in `\df has_permission`.

- [x] **T1.5** — REVOKE EXECUTE ON FUNCTION public.has_permission(text, uuid) FROM PUBLIC, anon; GRANT EXECUTE TO authenticated. Verify existing callers (`delete_purchase_atomic`, etc.) still call with 1-arg form and resolve without error (run `SELECT has_permission('purchases.delete')` as an authenticated user via MCP; confirm no "function does not exist" error).
  - **Acceptance:** REVOKE + GRANT applied; `has_permission('purchases.delete')` callable 1-arg by authenticated.

- [x] **T1.6** — Run the 5 MCP `execute_sql` integration scenarios to validate 4-branch order (design §8):
  1. Seed `role_permissions(cocinero, sales.delete, true)` + `user_permissions(<cocinero-user>, sales.delete, false)` → `has_permission('sales.delete', user)` = **false** (force-OFF beats role=true).
  2. Flip `user_permissions.enabled = true`, `role_permissions.enabled = false` → **true** (force-ON beats role=false).
  3. Delete `user_permissions` row, `role_permissions.enabled = true` → **true** (role default, branch 3).
  4. Delete `role_permissions` row too → **false** (branch 4, default deny).
  5. Use admin user_id, insert `user_permissions(admin, sales.delete, false)` → **true** (branch 1 invariant; force-OFF ignored for admin).
  - Clean up seed data after each scenario.
  - **Acceptance:** All 5 assertions pass; document results as a comment in the migration or in a verify note.

- [x] **T1.7** — Confirm `role_permissions` state for `purchases.delete`: run `SELECT * FROM role_permissions WHERE permission = 'purchases.delete'`. Expected: only an `admin=true` row exists (or no rows); cocinero/barista have none. Document findings. This confirms surfacing the key shows OFF toggles with no auto-row creation.
  - **Acceptance:** Finding documented; no cocinero/barista row for `purchases.delete`.

- [x] **T1.8** — Commit migration via `supabase db pull <name> --local --yes`; run `supabase migration list --local` to verify it appears. Run `supabase db advisors` (or MCP `get_advisors`) and fix any issues before proceeding.
  - **Acceptance:** Migration committed; advisors clean (no errors, warnings acceptable with rationale).

---

### Step 2 — Regenerate `database.ts`

**Spec:** Type Drift Elimination (prerequisite — `Tables<"user_permissions">` must exist)
**Sequencing:** blocks all TS work (steps 3–8). Run immediately after T1.8.

- [x] **T2.1** — Regenerate `src/types/database.ts` using Supabase type-gen CLI (`supabase gen types typescript --local > src/types/database.ts` or equivalent). Verify `Tables<"user_permissions">` is present in the output.
  - **Acceptance:** `src/types/database.ts` contains `user_permissions` table type with fields `user_id`, `permission`, `enabled`, `updated_at`, `updated_by`.

---

### Step 3 — Types

**Spec:** Type Drift Elimination, purchases.delete Visibility
**Sequencing:** depends on step 2; unblocks steps 4–6.
**File:** `src/types/permissions.ts`

- [x] **T3.1** — Add `"purchases.delete"` entry to `PERMISSION_DEFS` array with `group: "Compras"`. Add `"Compras"` to the `PermissionGroup` union. Add the corresponding `PermissionDef` object: `{ key: "purchases.delete", label: "Eliminar compras", description: "Permite borrar compras y revertir sus transacciones.", group: "Compras" }` (adjust Spanish copy if needed, but keep Spanish).
  - **Acceptance:** `PERMISSION_DEFS` has 7 entries; `PermissionGroup` union includes `"Compras"`.

- [x] **T3.2** — Replace the hand-maintained `PermissionKey` union with the derived form: `export type PermissionKey = (typeof PERMISSION_DEFS)[number]["key"]`. Remove the now-redundant explicit union. Add `as const` to the `PERMISSION_DEFS` array declaration so TypeScript narrows the key literal types. Update the `PermissionDef` interface: `key` field type becomes `PermissionKey` (or keep as `string` pre-derivation — order matters: derive key FROM the array, so `PermissionDef.key` stays `string` and `PermissionKey` is derived after).
  - **IMPORTANT pattern:** `PERMISSION_DEFS` must be declared `as const` (or typed with a const assertion) BEFORE `PermissionKey` is derived from it. Structure: `const PERMISSION_DEFS = [...] as const satisfies readonly PermissionDef[]`, then `export type PermissionKey = (typeof PERMISSION_DEFS)[number]["key"]`. Remove the old explicit union entirely.
  - **Acceptance:** `pnpm tsc --noEmit` passes; `PermissionKey` includes `"purchases.delete"` at compile time; passing `"unknown.key"` to a function expecting `PermissionKey` produces a TS error.

- [x] **T3.3** — Add `UserPermission` type derived from the new `database.ts`: `export type UserPermission = Tables<"user_permissions">`.

- [x] **T3.4** — Add `PermissionResolutionCtx` interface:
  ```ts
  export interface PermissionResolutionCtx {
    isAdmin: boolean;
    role: AppRole | null;
    rolePerms: RolePermission[];
    userPerms: UserPermission[];
  }
  ```
  - **Acceptance:** `src/types/permissions.ts` exports `UserPermission` and `PermissionResolutionCtx`; `pnpm tsc --noEmit` passes.

- [x] **T3.5** — Update `src/types/index.ts` barrel to re-export `UserPermission` and `PermissionResolutionCtx` (follow existing barrel pattern).

---

### Step 4 — Pure Resolver + Tests (TDD)

**Spec:** 4-Branch Resolution Parity, Admin Security Invariant
**Sequencing:** depends on step 3. Parallel to step 5 (independent files). Test file written FIRST (red), then implementation (green).
**Files:** `src/features/usuarios/services/permissionsResolver.ts` + `src/features/usuarios/services/permissionsResolver.test.ts`

- [x] **T4.1** — Write `permissionsResolver.test.ts` FIRST (red phase). Cover all 7 scenarios:
  1. admin `isAdmin=true`, no rows → **true** (branch 1 short-circuit).
  2. non-admin, user force-ON row (`enabled=true`), role=false → **true** (branch 2 wins).
  3. non-admin, user force-OFF row (`enabled=false`), role=true → **false** (branch 2 wins; force-OFF denies).
  4. non-admin, no user row, role row `enabled=true` → **true** (branch 3 applies).
  5. non-admin, no user row, role row `enabled=false` → **false** (branch 3 applies with false value).
  6. non-admin, no rows at all → **false** (branch 4 default deny).
  7. admin with a force-OFF user row (`enabled=false`) present → **true** (branch 1 runs before branch 2; invariant).
  8. `role=null`, non-admin → **false** (no role means no role-default; branch 4).
  - `pnpm test -- permissionsResolver` must show 8 failing tests at this point.

- [x] **T4.2** — Implement `src/features/usuarios/services/permissionsResolver.ts` (green phase). Signature: `export function resolvePermission(permission: PermissionKey, ctx: PermissionResolutionCtx): boolean`. Body mirrors the SQL 4-branch order exactly with identical branch comments cross-referencing `has_permission` SQL. Pure function: no `createClient`, no React, no I/O, no throw. `userPerms` is already scoped to the current user by the hook (find by `permission` only is correct).
  - **Acceptance:** `pnpm test -- permissionsResolver` shows 8 passing. Zero imports from hooks or components.

---

### Step 5 — Service Functions + Tests (TDD)

**Spec:** Tri-State Override Encoding, Service Functions Error Propagation
**Sequencing:** depends on step 3. Parallel to step 4. Test file written FIRST (red), then implementation (green).
**Files:** `src/features/usuarios/services/permissionsService.ts` (add 2 functions) + `src/features/usuarios/services/permissionsService.test.ts` (add test suite for new functions)

- [x] **T5.1** — Write the `setUserPermission` and `clearUserPermission` test suites FIRST (red phase) in `permissionsService.test.ts`. Mirror the `setRolePermission` suite structure using `makeMockSupabase`. Cover:

  **setUserPermission:**
  1. Upserts into `user_permissions` table (not other tables) — check `sb.insertCalls`.
  2. Upsert payload contains `user_id`, `permission`, `enabled`, `updated_at` (ISO string), `updated_by`.
  3. `onConflict` key is `"user_id,permission"`.
  4. `logAudit` called with `action: "cambiar_permiso"`, `targetTable: "user_permissions"`, `targetId: "${userId}:${permission}"`.
  5. Error propagates; `logAudit` NOT called.
  6. Works with `adminId: null`.

  **clearUserPermission:**
  1. Issues a DELETE on `user_permissions` (check `sb.deleteCalls`).
  2. DELETE filters by `user_id` AND `permission` (not a bulk delete).
  3. `logAudit` called with `action: "cambiar_permiso"`, `targetTable: "user_permissions"`, `targetDescription` containing "hereda del rol".
  4. Error propagates; `logAudit` NOT called.
  5. No error when deleting a row that doesn't exist (Supabase DELETE with `.eq` returns no error on 0 rows deleted — mock returns `{ error: null }`).

  - `pnpm test -- permissionsService` must show new tests failing at this point.

- [x] **T5.2** — Implement `setUserPermission` and `clearUserPermission` in `permissionsService.ts` (green phase).
  - `setUserPermission`: upsert into `user_permissions` with `onConflict: "user_id,permission"`; throw on error; call `logAudit` on success with `targetDescription: \`Permiso ${permission} para usuario ${userId} → ${enabled ? "activado" : "desactivado"}\``.
  - `clearUserPermission`: DELETE from `user_permissions` where `user_id = userId` AND `permission = permission`; throw on error; call `logAudit` with `targetDescription: \`Permiso ${permission} para usuario ${userId} → hereda del rol\``.
  - Interfaces (add to service file — do NOT export from types):
    ```ts
    interface SetUserPermissionParams {
      userId: string; permission: PermissionKey; enabled: boolean;
      adminId: string | null; adminName: string | null;
    }
    interface ClearUserPermissionParams {
      userId: string; permission: PermissionKey;
      adminId: string | null; adminName: string | null;
    }
    ```
  - Keep service file under 150 LOC.
  - **Acceptance:** `pnpm test -- permissionsService` shows all tests (old + new) passing.

---

### Step 6 — Hook Rewrite

**Spec:** 4-Branch Resolution Parity, purchases.delete Visibility (`.permissions` rename)
**Sequencing:** depends on steps 3, 4, 5. No test required (hook renders React — not pure; integration covered by verify scenarios).
**File:** `src/hooks/usePermissions.ts`

- [x] **T6.1** — BEFORE modifying the hook, grep the entire codebase for `.permissions` usage from `usePermissions`:
  ```
  grep -r "\.permissions" src/
  ```
  Identify every call site that reads the `permissions` property from `usePermissions()`. Currently: `PermissionsTab.tsx` uses `{ permissions, isLoading, mutate }`. Document all sites.
  - **Acceptance:** Complete list of `.permissions` consumers documented (expected: only `PermissionsTab.tsx`).

- [x] **T6.2** — Rewrite `src/hooks/usePermissions.ts` to add the second SWR fetch for current-user overrides:
  - Add `fetchUserPermissions(userId: string): Promise<UserPermission[]>` fetcher (select `*` from `user_permissions` where `user_id = userId`; RLS handles authorization).
  - Add second `useSWR(user ? ["user-permissions", user.id] : null, () => fetchUserPermissions(user!.id), SWR_CONFIG)` — null key while user is undefined (SWR skips, no waterfall).
  - Build `can` via `useCallback` over `resolvePermission(permission, { isAdmin, role, rolePerms, userPerms })` — derived during render, no effect.
  - Return shape: `{ rolePermissions, userPermissions, permissions: rolePerms, error, isLoading, mutate, can }`. **Keep `permissions: rolePerms` alias** so existing `PermissionsTab.tsx` code (`{ permissions }`) continues to compile without changes in PR1. The alias will be cleaned up in PR2 when the dashboard is rewritten.
  - `mutate` must resolve both SWR caches: `async () => { await Promise.all([mutateRole(), mutateUser()]); }`.
  - **Acceptance:** `pnpm tsc --noEmit` passes; `pnpm test` passes (no regressions); existing `PermissionsTab` compiles unchanged.

---

### Step 7 (PR1) — Resolver / Service Barrels

**Spec:** Type Drift Elimination (traceability via barrel)
**Sequencing:** depends on steps 4 + 5. This is the final PR1 step.

- [x] **T7.1** — Update `src/features/usuarios/index.ts` to export the new functions and resolver:
  ```ts
  export * from "./services/usersService";
  export * from "./services/permissionsService";     // already present; now includes setUserPermission + clearUserPermission
  export * from "./services/permissionsResolver";    // NEW: exports resolvePermission
  export { default as UsersTab } from "./components/UsersTab";
  export { default as PermissionsTab } from "./components/PermissionsTab";
  ```
  - **Acceptance:** `import { setUserPermission, clearUserPermission, resolvePermission } from "@/features/usuarios"` compiles.

- [x] **T7.2** — Run full test suite: `pnpm test`. All tests pass. Run `pnpm tsc --noEmit`. No type errors. Run `pnpm lint`. No lint errors.
  - **Acceptance:** 3 commands exit 0. PR1 is ready.

---

## PR2 — Dashboard (UI decomposition)

> Step 7 (design §7) + component barrel. Pure UI on top of PR1. Depends on PR1 merged.

---

### Step 8 — Dashboard Decomposition

**Spec:** Dashboard — Data-Driven Role Matrix, Dashboard — Per-User Override Sub-View, purchases.delete Visibility (display)
**Sequencing:** depends on PR1 merged. Steps below are sequential within PR2 (each component is referenced by the next).
**Files:** `src/features/usuarios/components/permissions/` (new directory)

- [ ] **T8.1** — Create `src/features/usuarios/components/permissions/Toggle.tsx`. Extract the `Toggle` component verbatim from the bottom of `PermissionsTab.tsx` into its own file. Export as named export. Props: `{ checked: boolean; disabled: boolean; onChange: () => void }`. Verify: `PermissionsTab` imports Toggle from the new file and still renders correctly (no visual change).
  - **Acceptance:** File < 50 LOC; `pnpm tsc --noEmit` passes.

- [ ] **T8.2** — Create `src/features/usuarios/components/permissions/TriStateControl.tsx`. Props: `{ value: "inherit" | "on" | "off"; disabled?: boolean; onChange: (next: "inherit" | "on" | "off") => void }`. Three-segment button group. Labels in Spanish: "Hereda" / "Sí" / "No". Each segment ≥ 44px tap target. Mobile-first layout (stacked by default, `sm:flex-row`). Active segment uses primary-600 color; inactive uses slate-200.
  - **Acceptance:** File < 80 LOC; `pnpm tsc --noEmit` passes.

- [ ] **T8.3** — Create `src/features/usuarios/components/permissions/RoleMatrix.tsx`. Props:
  ```ts
  interface RoleMatrixProps {
    defs: typeof PERMISSION_DEFS;
    roles: string[];                          // data-driven, non-admin
    isEnabled: (role: string, key: PermissionKey) => boolean;
    pending: Set<string>;
    onToggle: (role: string, key: PermissionKey) => void;
  }
  ```
  Move the matrix table JSX (thead + tbody with group rows) from `PermissionsTab.tsx` into this component. `roles` comes from the data-driven list (not `CONFIGURABLE_ROLES`). `ROLE_LABEL` mapping lives here or in a shared constants file. Admin column renders "Siempre" with no toggle.
  - **Acceptance:** File < 140 LOC; `pnpm tsc --noEmit` passes.

- [ ] **T8.4** — Create `src/features/usuarios/components/permissions/UserOverridePanel.tsx`. Props:
  ```ts
  interface UserOverridePanelProps {
    users: UserProfile[];
    defs: typeof PERMISSION_DEFS;
    selectedUserId: string | null;
    onSelectUser: (id: string) => void;
    resolveEffective: (userId: string, key: PermissionKey) => boolean;
    userOverrides: (userId: string) => UserPermission[];
    roleBaseline: (userId: string, key: PermissionKey) => boolean;
    pending: Set<string>;
    onSet: (userId: string, key: PermissionKey, enabled: boolean) => void;
    onInherit: (userId: string, key: PermissionKey) => void;
  }
  ```
  Renders: a user selector (`<select>` or native dropdown), then per-permission a `TriStateControl` plus a baseline hint ("Hereda del rol: Activado / Desactivado"). Current value derived from `userOverrides(selectedUserId)`: row with `enabled=true` → "on", `enabled=false` → "off", no row → "inherit". All copy in Spanish.
  - **Acceptance:** File < 170 LOC; `pnpm tsc --noEmit` passes; no `createClient` or service imports (presentational only).

- [ ] **T8.5** — Rewrite `src/features/usuarios/components/PermissionsTab.tsx` as a thin container:
  - Import `usePermissions`, `useAuth`, `useUsers` (existing hook), `setUserPermission`, `clearUserPermission`.
  - Derive `configRoles` from live `user_profiles` via `useUsers`: `const configRoles = users.filter(u => u.role !== 'admin').map(u => u.role)` → deduplicate → sort using `CONFIGURABLE_ROLES` as ordering hint (known roles first, then any new roles appended).
  - State: `pending: Set<string>`, `selectedUserId: string | null`.
  - Handlers: `handleRoleToggle`, `handleUserOverride` (calls `setUserPermission`), `handleUserInherit` (calls `clearUserPermission`). Each: `setPending`, `await service`, `await mutate()`, `toast.success/error`. Errors inline via toast — no `alert()`.
  - Admin-scoped fetch for selected user's overrides: `useSWR(["user-permissions", selectedUserId], ...)` (admin RLS reads all; lifted to container per design ADR-6).
  - Renders `<RoleMatrix .../>` and `<UserOverridePanel .../>`.
  - Remove `permissions` alias usage (use `rolePermissions` from hook). Remove `CONFIGURABLE_ROLES` import (replaced by live derivation).
  - **Acceptance:** File < 130 LOC; `pnpm tsc --noEmit` passes; `GROUP_ORDER` / `ROLE_LABEL` moved to appropriate child (RoleMatrix or a constants file).

- [ ] **T8.6** — Create `src/features/usuarios/components/permissions/index.ts` barrel:
  ```ts
  export { default as Toggle } from "./Toggle";
  export { default as TriStateControl } from "./TriStateControl";
  export { default as RoleMatrix } from "./RoleMatrix";
  export { default as UserOverridePanel } from "./UserOverridePanel";
  ```
  - **Acceptance:** `import { RoleMatrix } from "@/features/usuarios/components/permissions"` compiles.

---

### Step 9 (PR2) — Final Barrel + Verification Run

- [ ] **T9.1** — Update `src/features/usuarios/index.ts` to also export the new components if needed (or leave PermissionsTab as the single entry point — design intent is the container stays the public API; sub-components are internal to the feature). Verify `PermissionsTab` is still the default export accessible from the users page.

- [ ] **T9.2** — Run `pnpm test`. Run `pnpm tsc --noEmit`. Run `pnpm lint`. Run `pnpm build` (catch Next.js-specific issues). All pass.
  - **Acceptance:** All 4 commands exit 0. PR2 is ready.

- [ ] **T9.3** — Manual smoke test in dev (`pnpm dev`): open `/users`, navigate to Permisos tab. Verify:
  - `purchases.delete` row appears under "Compras" group.
  - Cocinero and barista columns show toggle OFF for `purchases.delete` (no auto-row created).
  - Admin column shows "Siempre" for all rows.
  - User Override Panel: select a non-admin user; tri-state shows "Hereda" for permissions with no user override row; baseline hint reflects the role's value.
  - Setting force-ON/OFF and back to Inherit works; audit log entry appears in `/auditoria`.

---

## Parallel vs Sequential Summary

```
Step 1 (T1.1–T1.8)  — sequential (DB migration, must complete first)
  ↓
Step 2 (T2.1)       — sequential (database.ts regen; gates all TS work)
  ↓
Step 3 (T3.1–T3.5)  — sequential (types; gates steps 4, 5, 6)
  ↓
Step 4 ──┬── Step 5  — PARALLEL (resolver vs service; independent files)
         ↓         ↓
         └──────────┘
              ↓
Step 6 (T6.1–T6.2)  — sequential after steps 4+5
  ↓
Step 7 (T7.1–T7.2)  — sequential (PR1 barrels + final check)

                    ─── PR1 merged ───

Step 8 (T8.1–T8.6)  — internally sequential (each component referenced by next), but Toggle and TriStateControl (T8.1, T8.2) can be written in parallel as neither depends on the other
  ↓
Step 9 (T9.1–T9.3)  — sequential (final verification)
```

---

## Task Index by Spec Requirement

| Requirement | Tasks |
|---|---|
| 4-Branch Resolution Parity | T1.4, T1.5, T1.6, T4.1, T4.2, T6.2 |
| Tri-State Override Encoding | T5.1, T5.2, T8.4, T8.5 |
| Admin Security Invariant | T1.4, T4.1 (scenario 7), T8.3 (no toggle for admin column) |
| user_permissions RLS | T1.2, T1.3 |
| purchases.delete Visibility | T3.1, T3.2, T1.7, T8.3, T8.5 |
| Type Drift Elimination | T3.2, T3.3, T3.4, T7.1 |
| Dashboard — Data-Driven Role Matrix | T8.3, T8.5 |
| Dashboard — Per-User Override Sub-View | T8.2, T8.4, T8.5, T9.3 |
| Service Error Propagation | T5.1, T5.2 |
| has_permission DEFAULT preservation (CRITICAL) | T1.4, T1.5 |
| .permissions rename safety | T6.1, T6.2 |
| Integration SQL scenarios | T1.6, T1.7 |

---

## Total Task Count

- **PR1:** 14 tasks (T1.1–T1.8, T2.1, T3.1–T3.5, T4.1–T4.2, T5.1–T5.2, T6.1–T6.2, T7.1–T7.2)
- **PR2:** 9 tasks (T8.1–T8.6, T9.1–T9.3)
- **Total:** 23 tasks
