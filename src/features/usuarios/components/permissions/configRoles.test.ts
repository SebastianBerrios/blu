/**
 * TDD tests for deriveConfigRoles — the pure function that builds the ordered,
 * deduplicated non-admin role list for the RoleMatrix from live user_profiles.
 *
 * Written FIRST (red phase). Implementation follows in configRoles.ts (green phase).
 */
import { describe, it, expect } from "vitest";
import { deriveConfigRoles } from "./configRoles";
import type { UserProfile } from "@/types/auth";

function makeUser(role: string, id = "u1"): UserProfile {
  return {
    id,
    role: role as UserProfile["role"],
    full_name: "Test User",
    is_active: true,
    created_at: new Date().toISOString(),
    avatar_url: null,
    email: "test@example.com",
    updated_at: null,
  };
}

describe("deriveConfigRoles", () => {
  it("excludes admin from the result", () => {
    const users = [makeUser("admin", "a1"), makeUser("cocinero", "c1")];
    const result = deriveConfigRoles(users);
    expect(result).not.toContain("admin");
    expect(result).toContain("cocinero");
  });

  it("deduplicates roles that appear in multiple users", () => {
    const users = [
      makeUser("cocinero", "c1"),
      makeUser("cocinero", "c2"),
      makeUser("barista", "b1"),
    ];
    const result = deriveConfigRoles(users);
    expect(result.filter((r) => r === "cocinero")).toHaveLength(1);
    expect(result).toContain("barista");
  });

  it("returns known roles in CONFIGURABLE_ROLES order first", () => {
    // CONFIGURABLE_ROLES = ["cocinero", "barista"]
    // Even if barista appears first in users, order should be cocinero, barista
    const users = [makeUser("barista", "b1"), makeUser("cocinero", "c1")];
    const result = deriveConfigRoles(users);
    expect(result.indexOf("cocinero")).toBeLessThan(result.indexOf("barista"));
  });

  it("appends unknown roles after known roles", () => {
    const users = [
      makeUser("cocinero", "c1"),
      makeUser("barista", "b1"),
      makeUser("pastelero", "p1"),
    ];
    const result = deriveConfigRoles(users);
    expect(result[0]).toBe("cocinero");
    expect(result[1]).toBe("barista");
    expect(result[2]).toBe("pastelero");
  });

  it("returns empty array when only admins exist", () => {
    const users = [makeUser("admin", "a1"), makeUser("admin", "a2")];
    expect(deriveConfigRoles(users)).toEqual([]);
  });

  it("returns empty array for empty user list", () => {
    expect(deriveConfigRoles([])).toEqual([]);
  });
});
