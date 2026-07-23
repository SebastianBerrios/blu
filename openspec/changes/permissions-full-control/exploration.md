# Exploration: permissions-full-control

> Artifact store: hybrid. Engram observation id 135. This file is the authoritative openspec copy.
> Date: 2026-07-23

## Goal

Control and assign ALL app permissions from a single admin module.

Decisions already made with the user:
- **Model:** per-role permissions (current) PLUS per-user overrides (a user can have a permission toggled on/off regardless of role).
- **Scope:** three levels — module/page access, actions within a module, field-level control.
- **Process:** first formal SDD change on the project.
- **Artifacts:** hybrid (openspec files + engram).

## Current State

### Existing permission system
- `role_permissions` table: PK `(role, permission)`, columns `enabled boolean`, `updated_at`, `updated_by`. Lives in Supabase; no local CREATE TABLE migration.
- DB function `has_permission(p_permission text, p_user_id uuid)` — resolves against `role_permissions` with an admin short-circuit. Called inside SECURITY DEFINER RPCs `delete_sale_atomic` and `delete_purchase_atomic`.
- TS `PermissionKey` union = **6 keys**: `sales.edit_any_date`, `sales.delete`, `inventory.adjust_stock`, `inventory.discard`, `inventory.produce`, `inventory.view_history`.
- A 7th key `purchases.delete` exists in the DB (migration `20260706T03`) but is NOT in the TS union / `PERMISSION_DEFS` — enforced by DB, invisible to the dashboard.
- `usePermissions()` fetches all rows, exposes `can(key)`. `CONFIGURABLE_ROLES = ["cocinero","barista"]`; admin always-all.
- Dashboard: `src/features/usuarios/components/PermissionsTab.tsx` — toggle matrix (6 keys × 2 roles), grouped by `PermissionGroup`.
- No per-user overrides today.

### Module/page access gating

| Page | Access rule | Enforcement layer |
|------|-------------|-------------------|
| `/categories` | All view; admin CRUD | Client `isAdmin` |
| `/products` | All view; admin create/delete/cost; non-admin edit own recipe | Client `isAdmin` |
| `/ingredients` | Admin only | page redirect |
| `/recipes` | Admin only | page redirect |
| `/sales` | All; action-level `can()` | role_permissions + DB RPC |
| `/pedidos` | All, no gating | — |
| `/compras` | All create/view; delete DB-gated | DB RPC |
| `/inventario` | All; actions `can()` | role_permissions (UI only for most) |
| `/horario` | All; admin management vs employee personal | Client `isAdmin` branch |
| `/actividades` | All; admin management vs own tasks | Client `isAdmin` branch |
| `/finanzas` | Admin only | page redirect |
| `/estadisticas` | Admin only | page redirect |
| `/auditoria` | Admin only | page redirect |
| `/users` | Admin only | page redirect |

Nav filtering (SideBar/BottomNav) is by `adminOnly` flag — **UI-only**, direct URL bypasses it. Middleware only checks auth, zero role awareness.

### Action-level gating (summary)
- DB-enforced: `sales.delete`, `purchases.delete`, `horario.approve_requests` (hardcoded admin in RPC), and — VERIFIED against live DB — inventory `adjust_stock` (`adjust_inventory_manual`), `discard` (`discard_inventory`), `produce` (`produce_recipe_batch` + `reverse_production`). All four inventory RPCs already call `has_permission(...)` and RAISE EXCEPTION on failure.
- UI-only: `sales.edit_any_date`, categories/products CRUD, horario/actividades management, purchases bank account.

> CORRECTION (2026-07-23): the exploration draft claimed inventory RPCs lacked `has_permission` — this was FALSE. `pg_get_functiondef` on the live database shows all four enforce it. These RPCs predate the local migrations directory, which is why a code/migration grep missed them. No live vulnerability; the security hotfix was cancelled.

### Field-level gating (UI-only today)
- `products.manufacturing_cost` / `suggested_price` via `hidePrice={!isAdmin}`.
- `categories.target_margin` column rendered only when `isAdmin`.
- `purchases.account_id` selector disabled for non-admins.

## Approaches & Recommendations

- **Fork 1 — per-user storage:** separate `user_permissions(user_id, permission, enabled, updated_at, updated_by)` table. **(recommended)** Resolution: admin → true; else user override if present; else role default (false if absent).
- **Fork 2 — resolution location:** DB `has_permission()` mirrors override-first logic (for DB-enforced actions) + client `can()` computes an `effectivePermissions` map (for UI gating). Same rule both sides.
- **Fork 3 — three levels in one registry:** unified flat key space with prefix convention `module.*`, `action.{module}.{verb}`, `field.{module}.{field}`; add `level` to `PERMISSION_DEFS`. ~28 keys.
- **Fork 4 — migrating hardcoded gates:** incremental. Keep hardcoded admin-only for `users`, `auditoria`, `finanzas`, `estadisticas` (safety invariant, never delegatable). Migrate the rest to `can()`.
- **Fork 5 — DB enforcement scope:** MUST enforce in DB: inventory `adjust_stock`/`discard`/`produce` (current gap). UI-only acceptable: `module.*`, `field.*`, categories/products CRUD (RLS already gates INSERT/DELETE to admin), `sales.edit_any_date`.

## Recommendation Summary
1. Create `user_permissions` table.
2. Update `has_permission()`: user override → role default → admin short-circuit preserved.
3. Patch inventory RPCs (`discard_inventory`, `produce_recipe_batch`, adjust) to call `has_permission()` — closes CRITICAL gap.
4. Expand `PermissionKey` to ~28 keys with prefix convention + `level` field; derive `PermissionKey` from `PERMISSION_DEFS` to avoid drift.
5. Update `usePermissions()` to fetch both tables and compute `effectivePermissions`.
6. Add `setUserPermission()` mirroring `setRolePermission()`.
7. Redesign `PermissionsTab`: role matrix + per-user override management.
8. Migrate configurable `isAdmin` gates to `can()`; keep finanzas/estadisticas/auditoria/users hardcoded.
9. Update SideBar/BottomNav to use `can()` for configurable nav items.

## Risks
- ~~**CRITICAL:** `discard_inventory`, `produce_recipe_batch` (and adjust) RPCs lack `has_permission`~~ — **RETRACTED, verified false against live DB.** All inventory RPCs enforce `has_permission`.
- **Real (pre-existing, known):** RLS allows any authenticated user to `UPDATE ingredients` directly via PostgREST (column control is UI-only per CLAUDE.md). Direct table writes bypass the RPC permission checks. This is the documented current model, not a regression; Phase 3 (field-level) + DB enforcement should decide whether to tighten it.
- `purchases.delete` in DB but absent from TS/dashboard.
- Module-access keys remain UI-only for most pages (acceptable; finanzas/stats/audit protected by RLS + redirect).
- TS drift: keep `PermissionKey` and `PERMISSION_DEFS` in lockstep (derive the type from the array).
- Dashboard redesign is the largest UI effort (~56 role cells + per-user override UI).

## Open questions for proposal
1. First-slice scope: which key groups land in v1?
2. Confirm `user_permissions` table design.
3. UX for per-user override in the users module.
4. Is the inventory RPC security fix in this change or a prerequisite hotfix PR?
