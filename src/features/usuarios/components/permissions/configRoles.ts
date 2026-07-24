/**
 * deriveConfigRoles — pure helper that builds the ordered, deduplicated
 * non-admin role list for RoleMatrix from live user_profiles data.
 *
 * Known roles (from CONFIGURABLE_ROLES) appear first in their defined order.
 * Any live role not in the known list is appended after.
 */
import type { UserProfile } from "@/types/auth";
import { CONFIGURABLE_ROLES } from "@/types/permissions";

export function deriveConfigRoles(users: UserProfile[]): string[] {
  // Unique non-admin, non-null roles from live data
  const liveRoles = [
    ...new Set(
      users
        .filter((u) => u.role !== "admin" && u.role !== null)
        .map((u) => u.role as string),
    ),
  ];

  // Known roles that are present in live data (preserving CONFIGURABLE_ROLES order)
  const known = (CONFIGURABLE_ROLES as readonly string[]).filter((r) => liveRoles.includes(r));

  // Live roles not in the known list (append in discovery order)
  const unknown = liveRoles.filter((r) => !(CONFIGURABLE_ROLES as readonly string[]).includes(r));

  return [...known, ...unknown];
}
