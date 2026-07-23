# permissions-full-control — Phase 1 Specification

> Change: permissions-full-control (Phase 1 — Foundation)
> Artifact store: hybrid
> Date: 2026-07-23
> Source: proposal.md + engram id 138

This is a full spec for a new domain (per-user permission overrides). No prior spec exists for this change.

---

## Purpose

Define the behavioral contract for Phase 1: a per-user permission override layer on top of the existing role-based system, drift-free type derivation, surfacing of `purchases.delete`, and a 4-branch resolution order that is identical in the database (`has_permission`) and the client (`can()`).

---

## Requirements

---

### Requirement: 4-Branch Resolution Parity

The system MUST resolve every permission lookup through exactly this ordered chain — in both `has_permission` (database) and `can()` (client) — with no divergence between the two:

1. If the user's `role` in `user_profiles` is `'admin'` → **allow** (invariant; no table lookup).
2. Else if a `user_permissions` row exists for `(user_id, permission)` → return that row's `enabled` value.
3. Else if a `role_permissions` row exists for `(role, permission)` → return that row's `enabled` value.
4. Else → **deny**.

Branch 2 MUST check row **existence**, not just the `enabled` column value, so that a force-OFF row (`enabled=false`) correctly overrides a permissive role default.

#### Scenario: Admin with no permission rows — always allowed

- GIVEN a user whose `user_profiles.role` is `'admin'`
- AND no `user_permissions` or `role_permissions` rows exist for any permission
- WHEN `has_permission` (or `can()`) is evaluated for any `PermissionKey`
- THEN the result is `true`

#### Scenario: Non-admin with user force-ON overriding role=false

- GIVEN a non-admin user
- AND a `role_permissions` row exists for their role with `enabled=false` for a given permission
- AND a `user_permissions` row exists for that user with `enabled=true` for the same permission
- WHEN the permission is evaluated
- THEN the result is `true`

#### Scenario: Non-admin with user force-OFF overriding role=true

- GIVEN a non-admin user
- AND a `role_permissions` row exists for their role with `enabled=true` for a given permission
- AND a `user_permissions` row exists for that user with `enabled=false` for the same permission
- WHEN the permission is evaluated
- THEN the result is `false`

#### Scenario: No user override row — role default applies

- GIVEN a non-admin user with no `user_permissions` row for a given permission
- AND a `role_permissions` row exists for their role with `enabled=true`
- WHEN the permission is evaluated
- THEN the result is `true`

#### Scenario: No rows anywhere — denied

- GIVEN a non-admin user
- AND no `user_permissions` row exists for that user and permission
- AND no `role_permissions` row exists for their role and permission
- WHEN the permission is evaluated
- THEN the result is `false`

---

### Requirement: Tri-State Override Encoding

The system MUST encode per-user override state as a tri-state through `user_permissions` row presence and the `enabled` column:

| State | Row present | `enabled` |
|-------|-------------|-----------|
| Inherit | No | — |
| Force-ON | Yes | `true` |
| Force-OFF | Yes | `false` |

Setting a user's override to "inherit" MUST delete the row (not set `enabled=null`), keeping the table sparse.

#### Scenario: Setting force-ON creates or updates a row

- GIVEN a non-admin user and a valid `PermissionKey`
- WHEN an admin calls `setUserPermission({ userId, permission, enabled: true, ... })`
- THEN a row exists in `user_permissions` with `enabled=true` for `(userId, permission)`
- AND `logAudit` is called with action `cambiar_permiso`

#### Scenario: Setting force-OFF creates or updates a row

- GIVEN a non-admin user and a valid `PermissionKey`
- WHEN an admin calls `setUserPermission({ userId, permission, enabled: false, ... })`
- THEN a row exists in `user_permissions` with `enabled=false` for `(userId, permission)`

#### Scenario: Setting inherit deletes the row

- GIVEN a `user_permissions` row exists for `(userId, permission)`
- WHEN an admin calls `clearUserPermission({ userId, permission, ... })`
- THEN no row exists in `user_permissions` for `(userId, permission)`
- AND `logAudit` is called with action `cambiar_permiso`

#### Scenario: Inherit when no row exists — no error

- GIVEN no `user_permissions` row exists for `(userId, permission)`
- WHEN an admin calls `clearUserPermission({ userId, permission, ... })`
- THEN the operation completes without error

---

### Requirement: Admin Security Invariant

The system MUST guarantee that no `user_permissions` row and no `role_permissions` row can grant or revoke an admin user's access. The admin branch (branch 1) MUST execute before any table lookup in both `has_permission` and `can()`.

#### Scenario: Admin is allowed even with a force-OFF user row

- GIVEN a user whose `user_profiles.role` is `'admin'`
- AND a `user_permissions` row exists for that user with `enabled=false` for a given permission
- WHEN the permission is evaluated
- THEN the result is `true`

#### Scenario: Admin is allowed even with a force-OFF role row

- GIVEN a user whose `user_profiles.role` is `'admin'`
- AND a `role_permissions` row exists for `('admin', permission)` with `enabled=false`
- WHEN the permission is evaluated
- THEN the result is `true`

---

### Requirement: `user_permissions` RLS Access Control

The `user_permissions` table MUST enforce row-level security such that:

- A non-admin user MAY read only their own rows (`user_id = auth.uid()`).
- An admin user MAY read all rows.
- Only admin users MAY INSERT, UPDATE, or DELETE rows.
- A non-admin MUST NOT be able to self-grant by writing their own `user_permissions` row.

#### Scenario: Non-admin reads own rows only

- GIVEN a non-admin user with `user_id = X`
- WHEN they query `user_permissions`
- THEN they receive only rows where `user_id = X`
- AND rows for other users are not returned

#### Scenario: Admin reads all rows

- GIVEN a user whose `user_profiles.role` is `'admin'`
- WHEN they query `user_permissions`
- THEN they receive rows for all users

#### Scenario: Non-admin cannot write

- GIVEN a non-admin user
- WHEN they attempt to INSERT, UPDATE, or DELETE any row in `user_permissions`
- THEN the operation is rejected by RLS

---

### Requirement: `purchases.delete` Visibility and Configurability

The permission key `purchases.delete` MUST be present in `PERMISSION_DEFS` under the group `"Compras"` and MUST be a member of `PermissionKey`. The dashboard MUST display it as configurable.

For roles that have no `role_permissions` row for `purchases.delete` (e.g., cocinero and barista as of the verified DB state), the dashboard MUST render the current state as **OFF** (denied) and MUST NOT auto-create enabled rows when the dashboard is first displayed.

The existing DB enforcement (calls to `has_permission('purchases.delete', ...)` inside `delete_purchase_atomic`) MUST remain unchanged.

#### Scenario: `purchases.delete` is a valid PermissionKey

- GIVEN `PERMISSION_DEFS` includes an entry with `key: "purchases.delete"` and `group: "Compras"`
- WHEN `PermissionKey` is derived from `PERMISSION_DEFS`
- THEN `"purchases.delete"` is a member of `PermissionKey` at compile time

#### Scenario: Dashboard shows purchases.delete as OFF for roles without a row

- GIVEN a cocinero or barista role with no `role_permissions` row for `purchases.delete`
- WHEN an admin opens the role permissions matrix in the dashboard
- THEN `purchases.delete` is displayed as **OFF** (disabled) for those roles
- AND no new `role_permissions` row is inserted

#### Scenario: purchases.delete DB enforcement unchanged

- GIVEN a non-admin user without `purchases.delete` permission
- WHEN `delete_purchase_atomic` is called for that user
- THEN `has_permission('purchases.delete', user_id)` resolves `false`
- AND the deletion is denied

---

### Requirement: Type Drift Elimination

`PermissionKey` MUST be derived from `PERMISSION_DEFS` using a type-level derivation so that adding or removing an entry from `PERMISSION_DEFS` automatically updates the type with no manual synchronization required.

The hand-maintained union `type PermissionKey = "sales.delete" | "sales.edit_any_date" | ...` MUST be replaced.

#### Scenario: Derived type includes all PERMISSION_DEFS keys

- GIVEN `PERMISSION_DEFS` contains 7 entries including `"purchases.delete"`
- WHEN `PermissionKey` is derived as `(typeof PERMISSION_DEFS)[number]["key"]`
- THEN `PermissionKey` is a union of all 7 keys
- AND the TypeScript compiler enforces membership without a separate union declaration

#### Scenario: Compiler catches unregistered key at call sites

- GIVEN `PermissionKey` is derived from `PERMISSION_DEFS`
- WHEN code passes a string not in `PERMISSION_DEFS` to `can()` or `has_permission`
- THEN TypeScript reports a compile-time error

---

### Requirement: Dashboard — Data-Driven Role Matrix

The role matrix in `PermissionsTab` MUST derive its configurable role columns from the distinct non-admin roles present in `user_profiles` (live query), not from a hardcoded `CONFIGURABLE_ROLES` literal. The admin column MUST be rendered as "Siempre" with no toggle.

#### Scenario: New role appears automatically in the matrix

- GIVEN a new non-admin role exists in `user_profiles`
- WHEN the permissions dashboard loads
- THEN the new role appears as a column in the role matrix without any code change

#### Scenario: Admin column has no toggle

- GIVEN the permissions dashboard is open
- WHEN an admin views the role matrix
- THEN the admin column shows "Siempre" and does not render a toggle control

---

### Requirement: Dashboard — Per-User Override Sub-View

The dashboard MUST include a per-user override sub-view where an admin selects a user and sees that user's effective permission for each `PermissionKey`, with a tri-state control (Inherit / On / Off).

- "Inherit" MUST display the resolved role baseline value so the admin can see what inheriting means for that user.
- Selecting "Inherit" MUST call `clearUserPermission`; selecting "On" or "Off" MUST call `setUserPermission`.
- Errors MUST be shown inline in the UI (no `alert()`).
- All UI copy MUST be in Spanish.

#### Scenario: Inherit shows resolved baseline

- GIVEN a user has no `user_permissions` row for a given permission
- AND their role has `enabled=true` in `role_permissions` for that permission
- WHEN the admin views that user's override panel
- THEN the "Inherit" option is selected and a visual indicator shows the baseline is ON

#### Scenario: Override write succeeds — audit logged

- GIVEN an admin sets a user's permission to force-ON
- WHEN `setUserPermission` completes successfully
- THEN the UI reflects the new state
- AND `audit_logs` contains an entry with `action='cambiar_permiso'` and `target_table='user_permissions'`

#### Scenario: Override write fails — inline error shown

- GIVEN a write to `user_permissions` returns an error
- WHEN the admin attempts to set an override
- THEN an error message is displayed inline in the UI
- AND no `alert()` is called

---

### Requirement: Service Functions Error Propagation

`setUserPermission()` and `clearUserPermission()` MUST throw on Supabase error and MUST NOT call `logAudit` if the database write fails. Both functions MUST call `logAudit` on success.

#### Scenario: setUserPermission propagates error

- GIVEN Supabase returns an error for the upsert
- WHEN `setUserPermission` is called
- THEN the error is thrown to the caller
- AND `logAudit` is NOT called

#### Scenario: clearUserPermission propagates error

- GIVEN Supabase returns an error for the delete
- WHEN `clearUserPermission` is called
- THEN the error is thrown to the caller
- AND `logAudit` is NOT called

---

## Security Invariants (non-negotiable across all requirements)

1. Admin access is always-all via `user_profiles.role='admin'` short-circuit ONLY. No data in `user_permissions` or `role_permissions` can alter this.
2. `user_permissions` writes are admin-only (RLS). A non-admin cannot self-grant.
3. `has_permission` MUST remain `SECURITY DEFINER` with `SET search_path = public, pg_temp` and REVOKE EXECUTE from anon.
4. A force-OFF row (`enabled=false`) MUST override a permissive role default (branch 2 checks existence, not value).

---

## Out of Scope (Phase 1)

- Module/nav access gating (`module.*` keys) → Phase 2
- Field-level control (`field.*` keys) → Phase 3
- Migrating hardcoded `isAdmin` gates to `can()` → later phases
- Adding new permission keys beyond the 7 defined in `PERMISSION_DEFS`
- Tightening the known direct-UPDATE-ingredients RLS gap

---

## Coverage Summary

| Requirement | Happy paths | Edge cases | Error states |
|---|---|---|---|
| 4-Branch Resolution Parity | 3 | 2 | 0 (no error state in resolution) |
| Tri-State Override Encoding | 2 | 1 | 0 |
| Admin Security Invariant | 2 | 0 | 0 |
| `user_permissions` RLS | 2 | 1 | 0 |
| `purchases.delete` Visibility | 2 | 1 | 0 |
| Type Drift Elimination | 1 | 1 | 0 |
| Dashboard — Role Matrix | 1 | 1 | 0 |
| Dashboard — User Override Sub-View | 1 | 1 | 1 |
| Service Error Propagation | 0 | 0 | 2 |
