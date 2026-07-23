/**
 * T4.1 — Tests for permissionsResolver.resolvePermission.
 * Covers the 8 scenarios from tasks spec: admin short-circuit, force-ON/OFF,
 * role default (true/false), no rows, role=null, admin with force-OFF invariant.
 *
 * Written FIRST (red phase), implementation follows (green phase).
 */
import { describe, it, expect } from "vitest";
import { resolvePermission } from "./permissionsResolver";
import type { PermissionResolutionCtx } from "@/types/permissions";
import type { UserPermission } from "@/types/permissions";
import type { RolePermission } from "@/types/permissions";

// Helper: build a minimal UserPermission row
function makeUserRow(permission: string, enabled: boolean): UserPermission {
  return {
    user_id: "user-uuid",
    permission,
    enabled,
    updated_at: new Date().toISOString(),
    updated_by: null,
  };
}

// Helper: build a minimal RolePermission row
function makeRoleRow(role: string, permission: string, enabled: boolean): RolePermission {
  return {
    role: role as RolePermission["role"],
    permission,
    enabled,
    updated_at: new Date().toISOString(),
    updated_by: null,
  };
}

const PERM = "sales.delete" as const;
const ROLE = "cocinero" as const;

describe("resolvePermission", () => {
  // Scenario 1: admin isAdmin=true, no rows → true (branch 1 short-circuit)
  it("returns true for admin regardless of empty rows", () => {
    const ctx: PermissionResolutionCtx = {
      isAdmin: true,
      role: null,
      rolePerms: [],
      userPerms: [],
    };
    expect(resolvePermission(PERM, ctx)).toBe(true);
  });

  // Scenario 2: non-admin, user force-ON row (enabled=true), role=false → true (branch 2 wins)
  it("returns true when user has force-ON row overriding role=false", () => {
    const ctx: PermissionResolutionCtx = {
      isAdmin: false,
      role: ROLE,
      rolePerms: [makeRoleRow(ROLE, PERM, false)],
      userPerms: [makeUserRow(PERM, true)],
    };
    expect(resolvePermission(PERM, ctx)).toBe(true);
  });

  // Scenario 3: non-admin, user force-OFF row (enabled=false), role=true → false (branch 2 wins; force-OFF denies)
  it("returns false when user has force-OFF row overriding role=true", () => {
    const ctx: PermissionResolutionCtx = {
      isAdmin: false,
      role: ROLE,
      rolePerms: [makeRoleRow(ROLE, PERM, true)],
      userPerms: [makeUserRow(PERM, false)],
    };
    expect(resolvePermission(PERM, ctx)).toBe(false);
  });

  // Scenario 4: non-admin, no user row, role row enabled=true → true (branch 3 applies)
  it("returns true when no user row and role row is enabled", () => {
    const ctx: PermissionResolutionCtx = {
      isAdmin: false,
      role: ROLE,
      rolePerms: [makeRoleRow(ROLE, PERM, true)],
      userPerms: [],
    };
    expect(resolvePermission(PERM, ctx)).toBe(true);
  });

  // Scenario 5: non-admin, no user row, role row enabled=false → false (branch 3 applies with false)
  it("returns false when no user row and role row is disabled", () => {
    const ctx: PermissionResolutionCtx = {
      isAdmin: false,
      role: ROLE,
      rolePerms: [makeRoleRow(ROLE, PERM, false)],
      userPerms: [],
    };
    expect(resolvePermission(PERM, ctx)).toBe(false);
  });

  // Scenario 6: non-admin, no rows at all → false (branch 4 default deny)
  it("returns false when no rows exist at all", () => {
    const ctx: PermissionResolutionCtx = {
      isAdmin: false,
      role: ROLE,
      rolePerms: [],
      userPerms: [],
    };
    expect(resolvePermission(PERM, ctx)).toBe(false);
  });

  // Scenario 7: admin with a force-OFF user row (enabled=false) present → true (branch 1 runs before branch 2; invariant)
  it("returns true for admin even with a force-OFF user row (admin invariant)", () => {
    const ctx: PermissionResolutionCtx = {
      isAdmin: true,
      role: "admin",
      rolePerms: [],
      userPerms: [makeUserRow(PERM, false)],
    };
    expect(resolvePermission(PERM, ctx)).toBe(true);
  });

  // Scenario 8: role=null, non-admin, no user row → false (no role means no role-default; branch 4)
  it("returns false when role is null for non-admin", () => {
    const ctx: PermissionResolutionCtx = {
      isAdmin: false,
      role: null,
      rolePerms: [makeRoleRow(ROLE, PERM, true)],
      userPerms: [],
    };
    expect(resolvePermission(PERM, ctx)).toBe(false);
  });

  // Scenario 9: role=null, non-admin, BUT a user force-ON row exists → true.
  // Parity with SQL: the user_permissions override is checked before any role
  // consideration, so a null role must NOT suppress an explicit user override.
  it("honors a user override even when role is null (SQL parity)", () => {
    const ctx: PermissionResolutionCtx = {
      isAdmin: false,
      role: null,
      rolePerms: [],
      userPerms: [makeUserRow(PERM, true)],
    };
    expect(resolvePermission(PERM, ctx)).toBe(true);
  });
});
