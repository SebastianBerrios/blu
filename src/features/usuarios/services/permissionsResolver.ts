import type { PermissionKey, PermissionResolutionCtx } from "@/types/permissions";

/**
 * resolvePermission — pure client-side resolution function.
 *
 * Resolution order (MUST stay identical to has_permission SQL in
 * supabase/migrations/20260723T02_has_permission_user_overrides.sql):
 *   1. admin short-circuit (user_profiles.role='admin')         -> TRUE
 *   2. user_permissions row EXISTS for (user, perm)             -> that row's enabled
 *   3. role_permissions row EXISTS for (role, perm)             -> that row's enabled
 *   4. otherwise                                                -> FALSE
 *
 * Pure function: no createClient, no React, no I/O, no throw.
 * userPerms is already scoped to the current user by the hook's fetch filter,
 * so finding by permission alone is correct (parity note: SQL uses user_id = p_user_id).
 */
export function resolvePermission(
  permission: PermissionKey,
  ctx: PermissionResolutionCtx,
): boolean {
  // branch 1: admin invariant (never data-driven)
  if (ctx.isAdmin) return true;

  // branch 2: per-user override wins if a row EXISTS (force-OFF must deny).
  // Independent of role — mirrors the SQL, which checks user_permissions
  // before any role consideration.
  const userRow = ctx.userPerms.find((p) => p.permission === permission);
  if (userRow) return userRow.enabled;

  // branch 3: role default if a role_permissions row EXISTS (requires a role)
  if (!ctx.role) return false;
  const roleRow = ctx.rolePerms.find(
    (p) => p.role === ctx.role && p.permission === permission,
  );
  if (roleRow) return roleRow.enabled;

  // branch 4: default deny
  return false;
}
