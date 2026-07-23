# Design: permissions-full-control — Phase 1 (Foundation)

> Artifact store: hybrid (this file + engram `sdd/permissions-full-control/design`).
> Date: 2026-07-23. Reads: proposal.md (authoritative) + engram `sdd/permissions-full-control/proposal` (id 138).
> Scope: Phase 1 only — per-user overrides, drift-free registry, surfacing `purchases.delete`. Design is the HOW at architectural level; task steps live in the tasks phase.

## 1. Architecture approach

**Pattern:** extend the existing role-based permission stack in place, adding one orthogonal layer (per-user overrides) without changing the layering. The stack already follows the project's `types → services → hooks → components → pages` flow; Phase 1 keeps every existing boundary and inserts:

- one new **DB table** (`user_permissions`) + a rewritten **resolution function** (`has_permission`),
- one new **derived type** and one new **row type**,
- two new **service functions** (mirror of `setRolePermission`),
- one **hook rewrite** that fetches both permission tables and exposes an effective map,
- one **pure resolver** function that is the single client-side authority for the 4-branch order and the primary unit-test target,
- a **decomposed dashboard** (container + presentational sub-components) under `features/usuarios/components/permissions/`.

**Two enforcement ladders, deliberately mirrored, never shared.** The DB `has_permission` RPC is the authoritative enforcement boundary; the client `can()` is UX-only. TS and SQL cannot share a source of truth, so the design pins the 4-branch order into ONE pure TS function (`resolvePermission`) and ONE SQL body, and requires them to be textually mirrored comment-for-comment. This is the central architectural decision (ADR-2) because divergence here is the dominant correctness risk.

**Layering compliance (verified against cafeteria-architecture rules):**

| Layer | New/changed unit | Imports | OK |
|-------|------------------|---------|----|
| types | `permissions.ts` (PermissionKey derive, UserPermission, PermissionResolutionCtx) | only `./database`, `./auth` | ✅ |
| utils/services | `permissionsService.ts` (+2 fns), `resolvePermission` (pure util) | types, `createClient`, `logAudit` | ✅ |
| hooks | `usePermissions.ts` (rewrite) | types, services/util, `useAuth`, SWR | ✅ |
| components | `permissions/` sub-components | types, hooks, services, ui | ✅ never imports pages |

No component calls `createClient()`. Writes flow component → service → Supabase. Errors: service throws → hook/component catches → inline UI + `toast` (no `alert()`).

---

## 2. Design decisions (ADR-style)

### ADR-1 — Tri-state via row presence, not a nullable column

**Decision:** encode inherit/force-ON/force-OFF as *row presence + `enabled` boolean*. No row = inherit; row `enabled=true` = force-ON; row `enabled=false` = force-OFF. "Inherit" **deletes** the row.

**Rationale:** keeps the table sparse (only explicit exceptions are stored), makes the resolution ladder a clean existence check (branch 2 = "does a row exist?"), and makes `enabled boolean NOT NULL` — no three-valued logic in SQL or TS. A nullable `enabled` would force every consumer to reason about `NULL` = inherit, which is exactly the ambiguity we avoid.

**Rejected alternative:** `enabled boolean NULL` with `NULL` = inherit. Rejected: adds tri-valued logic to two ladders, complicates the PK-based upsert, and leaves dead "inherit" rows that pollute the table and audit trail.

**Consequence:** `clearUserPermission` is a DELETE, not an UPDATE — a distinct service function (see ADR-5).

### ADR-2 — Single pure resolver + mirrored SQL as the parity contract

**Decision:** extract client resolution into a pure function `resolvePermission(permission, ctx)` (no React, no I/O). `can()` in the hook is a one-line wrapper over it. The SQL `has_permission` body implements the identical 4-branch order and carries a comment block cross-referencing the TS function.

**Rationale:** the proposal names client/DB drift as the top risk. A pure function is trivially unit-testable (Strict TDD) and becomes the one place the client order is defined. Mirroring is enforced by (a) identical branch comments in both files and (b) integration scenarios at verify. This satisfies vercel `rerender-derived-state-no-effect` (resolution is pure, derived, memoizable — never an effect).

**Rejected alternative:** resolve inline inside `can()` in the hook (as today). Rejected: not unit-testable without rendering React, and re-couples logic to the hook, making parity review harder.

**Consequence:** the resolver lives in the service/util layer so both the hook and the tests import it without touching React.

### ADR-3 — Admin invariant is branch 1 on BOTH ladders, never data-driven

**Decision:** `role='admin'` short-circuits to `true` before any table lookup, in both `resolvePermission` and `has_permission`. No `user_permissions` or `role_permissions` row can grant or revoke an admin.

**Rationale:** security invariant from the proposal. Making it branch 1 (pre-lookup) means a force-OFF row for an admin is structurally impossible to honor — the code never reaches branch 2 for an admin. This also means the dashboard must never render a toggle for the admin column (stays "Siempre").

**Rejected alternative:** representing admin-all as seeded `enabled=true` rows. Rejected: a force-OFF row could then silently revoke an admin; violates the invariant.

### ADR-4 — `has_permission` stays `LANGUAGE sql`

**Decision:** keep the function `LANGUAGE sql`, `STABLE`, `SECURITY DEFINER`, `SET search_path = public, pg_temp`, grants unchanged. The 4-branch order expresses cleanly as a single `SELECT` with `CASE`/`COALESCE` and `EXISTS` subqueries — no procedural control flow needed.

**Rationale:** SQL LANGUAGE functions inline better and match the live definition. The existence check for branch 2 is `EXISTS(SELECT 1 FROM user_permissions ...)` combined via `CASE`. Only if the expression becomes unreadable do we fall back to `plpgsql`; it does not here (see §4).

### ADR-5 — Two service functions mirroring `setRolePermission`

**Decision:** `setUserPermission` (upsert on conflict `user_id,permission`) and `clearUserPermission` (delete by `user_id` + `permission`). Both log `cambiar_permiso` to `audit_logs`, both throw on error, both keep the service < 150 LOC.

**Rationale:** the row-presence model (ADR-1) means "set On/Off" and "set Inherit" are physically different operations (upsert vs delete). Splitting them keeps each function single-responsibility and mirrors the existing `setRolePermission` test surface exactly (reuse `makeMockSupabase`).

**Rejected alternative:** one `setUserPermission(enabled: boolean | null)` that deletes on `null`. Rejected: hides two DB operations behind one signature, harder to test the delete path cleanly, and blurs the audit description.

### ADR-6 — Dashboard decomposition: container + three presentational children

**Decision:** split `PermissionsTab` into a thin container that owns data/mutations plus three presentational components under `features/usuarios/components/permissions/`: `RoleMatrix`, `UserOverridePanel`, `TriStateControl` (reuse/promote the existing `Toggle` for the boolean role cells). Container-presentational separation: the container holds `usePermissions`/`useUsers`/pending state and passes data + callbacks down; children are prop-driven and render-only.

**Rationale:** the proposal flags the current ~165-LOC `PermissionsTab` will exceed the 300-LOC limit once the override sub-view lands. The split keeps each file well under 300 and isolates the two independent concerns (role matrix vs per-user override) so they can ship in separate PRs (PR2 depends only on PR1's hook/service). **Hard-stop check: the decomposition fits within limits — see §7 LOC budget. No blocker.**

### ADR-7 — Data-driven roles from live `user_profiles`, `CONFIGURABLE_ROLES` retained as fallback ordering

**Decision:** derive the matrix's configurable role columns from the distinct non-admin roles present in `user_profiles` (via the existing `useUsers` hook), not from the hardcoded literal. Keep `CONFIGURABLE_ROLES` only as a stable *ordering/label* hint: roles it lists render in that order first, any live role not in the literal appends after. No new roles table exists in the schema (verified: roles are the `AppRole` union on `user_profiles.role`), so `user_profiles` is the authoritative source.

**Rationale:** proposal open question #4. A future role appears automatically without a code change, while known roles keep a deterministic order. `admin` is always excluded from columns (ADR-3).

**Rejected alternative:** a dedicated `roles` table. Rejected: none exists; out of scope for Phase 1; `user_profiles.role` is sufficient and already fetched by `useUsers`.

---

## 3. `user_permissions` table (DDL + RLS)

Migration file (follow repo convention — timestamped name, rollback header comment, `public` schema): `supabase/migrations/<ts>_user_permissions_and_has_permission.sql`. Create via `execute_sql` while iterating, then commit with `supabase db pull` per the supabase skill; the generated `database.ts` is regenerated afterward (§7 sequencing).

```sql
-- Rollback:
--   DROP TABLE IF EXISTS public.user_permissions;
--   (has_permission is restored by re-running the previous CREATE OR REPLACE)

CREATE TABLE public.user_permissions (
  user_id    uuid        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  permission text        NOT NULL,
  enabled    boolean     NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (user_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- SELECT: own rows, or admin sees all.
CREATE POLICY user_permissions_select ON public.user_permissions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles
               WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- INSERT/UPDATE/DELETE: admin-only (matches role_permissions write model).
CREATE POLICY user_permissions_insert ON public.user_permissions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles
                      WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE POLICY user_permissions_update ON public.user_permissions
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles
                      WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE POLICY user_permissions_delete ON public.user_permissions
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = (SELECT auth.uid()) AND role = 'admin'));
```

**Notes.**
- `(SELECT auth.uid())` wrapping is the project's RLS pattern (see `20260706T07`) and is the Postgres RLS init-plan optimization (evaluated once per query, not per row) — consistent with supabase-postgres-best-practices `security-`/`query-` guidance.
- `updated_by` is nullable to allow the `adminId = null` edge (mirrors `role_permissions` and the existing service null-admin test).
- **Index decision: NONE beyond the PK.** The only read path is "one user's overrides" filtered by `user_id`, and `user_id` is the leading column of the composite PK `(user_id, permission)` — the PK B-tree already serves `WHERE user_id = ?` as a range scan. Adding a standalone `user_id` index would be redundant. The RLS admin-all SELECT scans by `user_id` too. No secondary index warranted. (Resolves proposal open question #1.)
- `UPDATE` needs a `SELECT` policy to see the row first (supabase skill trap) — satisfied because admins pass the SELECT policy's admin branch. The `update` policy exists for completeness even though the service uses upsert (which is INSERT ... ON CONFLICT DO UPDATE, exercising both INSERT and UPDATE policies).

---

## 4. `has_permission` new body (4-branch, `LANGUAGE sql`)

> ⚠️ CORRECTION (orchestrator, 2026-07-23): `p_user_id` MUST keep `DEFAULT auth.uid()`. The live callers
> (`discard_inventory`, `produce_recipe_batch`, `adjust_inventory_manual`, `reverse_production`, and the
> `delete_*_atomic` RPCs) invoke `has_permission('some.key')` with a SINGLE argument and rely on the default.
> Dropping the default breaks all of them (no 1-arg overload resolves). Apply MUST preserve it.

```sql
CREATE OR REPLACE FUNCTION public.has_permission(p_permission text, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  -- Resolution order (MUST stay identical to resolvePermission in
  -- src/features/usuarios/services/permissionsResolver.ts):
  --   1. admin short-circuit (user_profiles.role='admin')         -> TRUE
  --   2. user_permissions row EXISTS for (user, perm)             -> that row's enabled
  --   3. role_permissions row EXISTS for (role, perm)             -> that row's enabled
  --   4. otherwise                                                -> FALSE
  SELECT CASE
    -- branch 1: admin invariant (never data-driven)
    WHEN EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = p_user_id AND up.role = 'admin'
    ) THEN true
    -- branch 2: per-user override wins if a row EXISTS (force-OFF must deny)
    WHEN EXISTS (
      SELECT 1 FROM public.user_permissions uperm
      WHERE uperm.user_id = p_user_id AND uperm.permission = p_permission
    ) THEN (
      SELECT uperm.enabled FROM public.user_permissions uperm
      WHERE uperm.user_id = p_user_id AND uperm.permission = p_permission
    )
    -- branch 3: role default if a role_permissions row EXISTS
    WHEN EXISTS (
      SELECT 1 FROM public.role_permissions rp
      JOIN public.user_profiles up ON up.role = rp.role
      WHERE up.id = p_user_id AND rp.permission = p_permission
    ) THEN (
      SELECT rp.enabled FROM public.role_permissions rp
      JOIN public.user_profiles up ON up.role = rp.role
      WHERE up.id = p_user_id AND rp.permission = p_permission
    )
    -- branch 4: default deny
    ELSE false
  END;
$$;

-- Preserve existing privilege posture (no regression):
REVOKE EXECUTE ON FUNCTION public.has_permission(text, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_permission(text, uuid) TO authenticated;
```

**Why existence check in branch 2 (not `COALESCE(enabled, ...)`)**: a force-OFF row has `enabled=false`. If branch 2 tested `enabled` truthiness it would fall through to the role default on a force-OFF and fail to deny. Testing EXISTENCE first, then returning `enabled`, makes force-OFF authoritative. This is the invariant the SQL-scenario tests target at verify.

**LANGUAGE sql confirmed clean** (ADR-4): the `CASE` with `EXISTS` guards expresses the ladder without procedural flow; no `plpgsql` needed. The double-subquery per branch (EXISTS then scalar) is intentional for readability and is index-served by the PKs; the function is `STABLE` and called per authorization, not in hot loops.

---

## 5. Pure resolver `resolvePermission`

**Location:** `src/features/usuarios/services/permissionsResolver.ts` (service/util layer — pure, no `createClient`, no React). Exported through the feature barrel and imported by both the hook and its tests. This is the highest-value unit test in the change.

**Types (added to `src/types/permissions.ts`):**

```ts
export type UserPermission = Tables<"user_permissions">;

export interface PermissionResolutionCtx {
  isAdmin: boolean;
  role: AppRole | null;
  rolePerms: RolePermission[];   // all role_permissions rows (as fetched today)
  userPerms: UserPermission[];   // current user's user_permissions rows
}
```

**Signature + body (mirrors the SQL branch-for-branch):**

```ts
// Resolution order (MUST stay identical to has_permission SQL):
//   1. admin short-circuit -> true
//   2. user_permissions row EXISTS -> that row's enabled
//   3. role_permissions row EXISTS -> that row's enabled
//   4. otherwise -> false
export function resolvePermission(
  permission: PermissionKey,
  ctx: PermissionResolutionCtx,
): boolean {
  // branch 1: admin invariant (never data-driven)
  if (ctx.isAdmin) return true;
  if (!ctx.role) return false;

  // branch 2: per-user override wins if a row EXISTS (force-OFF must deny)
  const userRow = ctx.userPerms.find((p) => p.permission === permission);
  if (userRow) return userRow.enabled;

  // branch 3: role default if a role_permissions row EXISTS
  const roleRow = ctx.rolePerms.find(
    (p) => p.role === ctx.role && p.permission === permission,
  );
  if (roleRow) return roleRow.enabled;

  // branch 4: default deny
  return false;
}
```

**Return:** `boolean`. Pure and total — no throw, no I/O. `userPerms` is already scoped to the current user by the hook's fetch filter, so `find` by `permission` alone is correct (parity note documented in code).

**Unit tests (`permissionsResolver.test.ts`, Strict TDD, red→green):** admin→true regardless of rows; user force-ON over role false; user force-OFF over role true; no user row → role default (both true and false); no rows → false; `role=null` → false; admin with a force-OFF user row still → true (invariant guard).

---

## 6. `usePermissions()` shape

Keeps the `can(key) => boolean` signature so every existing call site is unchanged. Adds a second SWR fetch for the current user's overrides and builds the effective map by memoized derivation during render (NOT `useEffect`).

```ts
export function usePermissions() {
  const { user, role, isAdmin, isLoading: authLoading } = useAuth();

  const { data: roleData, error: roleErr, isLoading: roleLoading, mutate: mutateRole } =
    useSWR("role-permissions", fetchRolePermissions, SWR_CONFIG);

  // Current user's overrides only; null key while unauthenticated (SWR skips).
  const { data: userData, error: userErr, isLoading: userLoading, mutate: mutateUser } =
    useSWR(user ? ["user-permissions", user.id] : null,
           () => fetchUserPermissions(user!.id), SWR_CONFIG);

  const rolePerms = roleData ?? [];
  const userPerms = userData ?? [];

  // Derived during render, memoized on the fetched arrays — no effect.
  const can = useCallback(
    (permission: PermissionKey) =>
      resolvePermission(permission, { isAdmin, role, rolePerms, userPerms }),
    [isAdmin, role, rolePerms, userPerms],
  );

  return {
    rolePermissions: rolePerms,
    userPermissions: userPerms,
    error: roleErr ?? userErr,
    isLoading: roleLoading || userLoading || authLoading,
    mutate: async () => { await Promise.all([mutateRole(), mutateUser()]); },
    can,
  };
}
```

**Design points.**
- SWR keys: `"role-permissions"` (unchanged) and `["user-permissions", user.id]` (composite key pattern already used in the codebase). `null` key while `user` is undefined so SWR does not fire — no waterfall, no stale fetch.
- `fetchUserPermissions(userId)` selects `*` from `user_permissions` `.eq("user_id", userId)` — RLS lets a user read their own rows, so no privilege issue for the current-user fetch.
- `can` memoized via `useCallback` over the fetched arrays: derived, stable identity between renders when data is unchanged (vercel `rerender-derived-state-no-effect`). No intermediate `effectivePermissions` object is required — `resolvePermission` computes on demand and is O(rows). If a materialized map is preferred for the dashboard, it can be a `useMemo` over `PERMISSION_DEFS` in the container, still derived-not-effect.
- `mutate` resolves both SWR caches so a write refreshes role and user data together.
- Backward compatibility: the previous hook returned `permissions`; call sites use only `can` and `isLoading`. Renaming to `rolePermissions` is safe *iff* no site reads `.permissions` — the tasks phase must grep for `.permissions` usages and update the dashboard (which reads it). Keep an aliased `permissions: rolePerms` if any external site depends on it.

---

## 7. Component decomposition + sequencing

### Component tree (`src/features/usuarios/components/`)

```
PermissionsTab.tsx                 (container, "use client") — < 120 LOC
  permissions/
    RoleMatrix.tsx                 (presentational)          — < 130 LOC
    UserOverridePanel.tsx          (presentational + selector)— < 160 LOC
    TriStateControl.tsx            (presentational)          — < 70 LOC
    Toggle.tsx                     (promoted from PermissionsTab) — < 40 LOC
    index.ts                       (barrel)
```

**Boundaries / props.**
- **`PermissionsTab` (container):** owns `useAuth`, `usePermissions`, `useUsers`, and `pending: Set<string>`. Defines `handleRoleToggle` (calls `setRolePermission`) and `handleUserOverride` (calls `setUserPermission`) / `handleUserInherit` (calls `clearUserPermission`), each `await mutate()` + `toast`. Renders `<RoleMatrix .../>` and `<UserOverridePanel .../>`. No JSX-heavy tables here.
- **`RoleMatrix`** props: `{ defs, roles, isEnabled(role, key), pending, onToggle(role, key) }`. Pure render of the grouped matrix (moves the current table JSX out of `PermissionsTab`). `roles` is the data-driven list (ADR-7).
- **`UserOverridePanel`** props: `{ users, defs, selectedUserId, onSelectUser, resolveEffective(userId, key), roleBaseline(userId, key), pending, onSet(userId, key, enabled), onInherit(userId, key) }`. Renders a user selector (native `<select>` or existing pattern) then, per permission key, a `TriStateControl` plus a baseline hint ("Hereda del rol: Activado/Desactivado"). Note: the panel resolves the *selected* user's effective value via `resolvePermission` using that user's overrides — which requires fetching the selected user's `user_permissions` rows (admin can read all via RLS). This admin-scoped fetch is a small addition (a `useSWR(["user-permissions", selectedUserId])` inside the panel, or lifted to the container). Design choice: **lift to container** to keep one data-owner; panel stays presentational.
- **`TriStateControl`** props: `{ value: "inherit" | "on" | "off", disabled, onChange(next) }`. Three-segment control (segmented buttons), Spanish labels "Hereda / Sí / No", ≥44px tap targets, mobile-first stacked with `sm:` inline. Emits the next state; container maps `inherit→clearUserPermission`, `on→setUserPermission(true)`, `off→setUserPermission(false)`.
- **`Toggle`** unchanged behavior, promoted to its own file for reuse by `RoleMatrix`.

**Container-presentational rule:** children receive data + callbacks only; no `createClient`, no service imports inside presentational children (services imported only in the container). Errors surface as `toast` + optional inline message; never `alert()`.

**LOC budget (hard-stop check — PASSES):** current `PermissionsTab` ≈ 165 LOC contains the matrix + Toggle. Splitting matrix→`RoleMatrix` (~120) + `Toggle` (~40) leaves the container ~90; adding the override panel (~150) and `TriStateControl` (~65) keeps every file under its limit (component < 300, and each here < 170). **No file exceeds limits — decomposition is feasible; no hard-stop.**

**Barrel exports.**
- `features/usuarios/components/permissions/index.ts` exports `RoleMatrix`, `UserOverridePanel`, `TriStateControl`, `Toggle`.
- `features/usuarios/index.ts` gains `setUserPermission`, `clearUserPermission` (auto via `export * from "./services/permissionsService"`), and `resolvePermission` (via `export * from "./services/permissionsResolver"`). `PermissionsTab` export stays.

### Service functions (§5 companion) — exact shapes

```ts
interface SetUserPermissionParams {
  userId: string; permission: PermissionKey; enabled: boolean;
  adminId: string | null; adminName: string | null;
}
// upsert into user_permissions on conflict (user_id,permission); logAudit; throw on error.
export async function setUserPermission(p: SetUserPermissionParams): Promise<void>;

interface ClearUserPermissionParams {
  userId: string; permission: PermissionKey;
  adminId: string | null; adminName: string | null;
}
// DELETE from user_permissions where user_id + permission; logAudit; throw on error.
export async function clearUserPermission(p: ClearUserPermissionParams): Promise<void>;
```

Audit for both: `action: "cambiar_permiso"`, `targetTable: "user_permissions"`, `targetId: "${userId}:${permission}"`, `targetDescription` describing set (`→ activado/desactivado`) or clear (`→ hereda del rol`), `details: { userId, permission, enabled? }`. `setUserPermission` upsert payload: `{ user_id, permission, enabled, updated_at: ISO, updated_by: adminId }`, `onConflict: "user_id,permission"`. Tests mirror the `setRolePermission` suite via `makeMockSupabase` (upsert lands in `insertCalls`; delete lands in `deleteCalls`; error path via `setResult("user_permissions", { error })`).

### Sequencing (resolves proposal open question, ADR ordering)

1. **DB migration** — `CREATE TABLE user_permissions` + RLS + `CREATE OR REPLACE has_permission`. Iterate with `execute_sql`; verify the 4-branch scenarios via MCP.
2. **Regenerate `database.ts`** — `supabase db pull` / generate types so `Tables<"user_permissions">` exists. **Blocks everything TS-side.**
3. **Types** — derive `PermissionKey` from `PERMISSION_DEFS`; add `purchases.delete` + `"Compras"` group; add `UserPermission` + `PermissionResolutionCtx`. (Depends on step 2 for the row type.)
4. **Pure resolver + tests** (`permissionsResolver.ts` / `.test.ts`) — TDD, no DB.
5. **Service + tests** — `setUserPermission` / `clearUserPermission` + `.test.ts` (TDD).
6. **Hook rewrite** — `usePermissions` fetches both tables, wraps `resolvePermission`.
7. **Dashboard** — decompose into `permissions/` sub-components; wire container to service + hook.
8. **Barrels** — update both `index.ts` files.

Delivery: PR1 = steps 1–6 + barrels for service/resolver (backend + logic, no visible UI beyond `purchases.delete` appearing). PR2 = step 7 + component barrel (pure UI on PR1). Matches the proposal's chained-PR recommendation.

---

## 8. Integration verification (coverage gap the unit tests cannot cover)

The SQL `has_permission` ladder has no vitest harness (no DB in unit env). At apply/verify, run MCP `execute_sql` scenarios and record as manual checks:

1. Seed `role_permissions(cocinero, sales.delete, true)` + `user_permissions(<cocinero-user>, sales.delete, false)` → `has_permission('sales.delete', user)` = **false** (force-OFF beats permissive role).
2. Flip to `user_permissions.enabled = true` with `role_permissions.enabled = false` → **true** (force-ON beats restrictive role).
3. No `user_permissions` row, `role_permissions.enabled = true` → **true** (role default, branch 3).
4. No rows at all → **false** (branch 4).
5. Admin user, `user_permissions(admin, sales.delete, false)` present → **true** (branch 1 invariant; force-OFF ignored for admin).

Also confirm the current `role_permissions` default for `purchases.delete` before surfacing it (proposal risk): only an `admin=true` row exists today; `cocinero`/`barista` have none → surfacing the key in the dashboard shows both toggles OFF and changes nothing until an admin acts. Document this expectation in the tasks phase.

---

## 9. Risks / assumptions carried forward

- **Parity drift (primary).** Mitigated by ADR-2 (one pure resolver + mirrored SQL comments + §8 scenarios). Still inherent — TS and SQL cannot share source.
- **`.permissions` rename in hook.** The dashboard reads `permissions` today; tasks must update it or keep an alias. Low risk, mechanical.
- **Selected-user override fetch in the panel.** Requires an admin-scoped `user_permissions` read for the selected user (RLS admin-all covers it). Lifted to container per ADR-6; adds one SWR key `["user-permissions", selectedUserId]`.
- **`database.ts` regen ordering.** Step 2 gates all TS work; if skipped, `Tables<"user_permissions">` is missing and step 3 fails to compile — surfaced early.
- **First per-user override pattern.** Phases 2/3 reuse the tri-state + row-presence + 4-branch primitives; a wrong choice compounds. The design deliberately keeps them minimal and mirrored.
- **No hard-stop.** Dashboard decomposition fits all LOC limits (§7). Design is implementable as specified.
