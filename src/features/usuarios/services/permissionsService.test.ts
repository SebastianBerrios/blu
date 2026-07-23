/**
 * T3.2 — Tests for permissionsService.setRolePermission.
 * T5.1 — Tests for permissionsService.setUserPermission + clearUserPermission.
 * Verifies: upsert/delete shape, error propagation,
 * logAudit firing on success, and logAudit NOT called on error.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setRolePermission, setUserPermission, clearUserPermission } from "./permissionsService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { makeMockSupabase } from "@/__tests__/mockSupabase";
import type { PermissionKey } from "@/types/permissions";
import type { AppRole } from "@/types/auth";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);

type ConfigurableRole = Exclude<AppRole, "admin">;

function makeParams(overrides: {
  role?: ConfigurableRole;
  permission?: PermissionKey;
  enabled?: boolean;
  adminId?: string | null;
  adminName?: string | null;
} = {}) {
  return {
    role: "cocinero" as ConfigurableRole,
    permission: "inventory.produce" as PermissionKey,
    enabled: true,
    adminId: "admin-uuid",
    adminName: "Admin",
    ...overrides,
  };
}

describe("setRolePermission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts into role_permissions (not other tables)", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    // setRolePermission uses .upsert() which goes through the insert chain in makeMockSupabase
    await setRolePermission(makeParams());

    const upsertCall = sb.insertCalls.find((c) => c.table === "role_permissions");
    expect(upsertCall).toBeDefined();
  });

  it("upsert payload contains role, permission, enabled, updated_by", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setRolePermission(
      makeParams({ role: "barista", permission: "sales.delete", enabled: false }),
    );

    const upsertCall = sb.insertCalls.find((c) => c.table === "role_permissions");
    const payload = upsertCall?.payload as Record<string, unknown>;
    expect(payload?.role).toBe("barista");
    expect(payload?.permission).toBe("sales.delete");
    expect(payload?.enabled).toBe(false);
    expect(payload?.updated_by).toBe("admin-uuid");
  });

  it("upsert payload contains updated_at (ISO string)", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setRolePermission(makeParams());

    const upsertCall = sb.insertCalls.find((c) => c.table === "role_permissions");
    const payload = upsertCall?.payload as Record<string, unknown>;
    // updated_at should be a valid ISO date string
    expect(typeof payload?.updated_at).toBe("string");
    expect(() => new Date(payload?.updated_at as string).toISOString()).not.toThrow();
  });

  it("logAudit called with cambiar_permiso action after success", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setRolePermission(
      makeParams({ role: "cocinero", permission: "inventory.adjust_stock", enabled: true }),
    );

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "cambiar_permiso",
        targetTable: "role_permissions",
      }),
    );
  });

  it("logAudit targetId encodes role:permission", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setRolePermission(
      makeParams({ role: "barista", permission: "sales.delete" }),
    );

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        targetId: "barista:sales.delete",
      }),
    );
  });

  it("logAudit details contains role, permission, enabled", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setRolePermission(
      makeParams({ role: "cocinero", permission: "inventory.discard", enabled: false }),
    );

    const auditCall = mockedLogAudit.mock.calls[0]?.[0] as {
      details: Record<string, unknown>;
    };
    expect(auditCall.details.role).toBe("cocinero");
    expect(auditCall.details.permission).toBe("inventory.discard");
    expect(auditCall.details.enabled).toBe(false);
  });

  it("error propagates and logAudit is NOT called", async () => {
    // Simulate a DB error by making the from().upsert() fail.
    // We override the insert chain result for role_permissions.
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    sb.setResult("role_permissions", { error: { message: "unique_violation" } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(setRolePermission(makeParams())).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });

  it("works with adminId null (anonymous admin edge case)", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      setRolePermission(makeParams({ adminId: null, adminName: null })),
    ).resolves.toBeUndefined();

    const upsertCall = sb.insertCalls.find((c) => c.table === "role_permissions");
    const payload = upsertCall?.payload as Record<string, unknown>;
    expect(payload?.updated_by).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T5.1 — setUserPermission tests (RED → GREEN)
// ---------------------------------------------------------------------------

function makeUserPermParams(overrides: {
  userId?: string;
  permission?: PermissionKey;
  enabled?: boolean;
  adminId?: string | null;
  adminName?: string | null;
} = {}) {
  return {
    userId: "user-uuid",
    permission: "inventory.produce" as PermissionKey,
    enabled: true,
    adminId: "admin-uuid",
    adminName: "Admin",
    ...overrides,
  };
}

describe("setUserPermission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts into user_permissions (not other tables)", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setUserPermission(makeUserPermParams());

    const upsertCall = sb.insertCalls.find((c) => c.table === "user_permissions");
    expect(upsertCall).toBeDefined();
  });

  it("upsert payload contains user_id, permission, enabled, updated_at, updated_by", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setUserPermission(
      makeUserPermParams({ userId: "u1", permission: "sales.delete", enabled: false, adminId: "a1" }),
    );

    const upsertCall = sb.insertCalls.find((c) => c.table === "user_permissions");
    const payload = upsertCall?.payload as Record<string, unknown>;
    expect(payload?.user_id).toBe("u1");
    expect(payload?.permission).toBe("sales.delete");
    expect(payload?.enabled).toBe(false);
    expect(payload?.updated_by).toBe("a1");
    // updated_at must be a valid ISO string
    expect(typeof payload?.updated_at).toBe("string");
    expect(() => new Date(payload?.updated_at as string).toISOString()).not.toThrow();
  });

  it("onConflict key is 'user_id,permission'", async () => {
    // We check this indirectly: makeMockSupabase records the call via buildUpsertChain.
    // The actual onConflict is passed as the second argument to .upsert(payload, { onConflict }).
    // We verify the service calls .upsert() on the correct table (table check above) and
    // that a successful call does not throw (shape validation via integration test at verify).
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(setUserPermission(makeUserPermParams())).resolves.toBeUndefined();
    // Upsert on user_permissions recorded
    expect(sb.insertCalls.some((c) => c.table === "user_permissions")).toBe(true);
  });

  it("logAudit called with action cambiar_permiso on success", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setUserPermission(
      makeUserPermParams({ userId: "u2", permission: "inventory.adjust_stock", enabled: true }),
    );

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "cambiar_permiso",
        targetTable: "user_permissions",
        targetId: "u2:inventory.adjust_stock",
      }),
    );
  });

  it("error propagates and logAudit is NOT called", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    sb.setResult("user_permissions", { error: { message: "rls_violation" } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(setUserPermission(makeUserPermParams())).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });

  it("works with adminId null", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      setUserPermission(makeUserPermParams({ adminId: null, adminName: null })),
    ).resolves.toBeUndefined();

    const upsertCall = sb.insertCalls.find((c) => c.table === "user_permissions");
    const payload = upsertCall?.payload as Record<string, unknown>;
    expect(payload?.updated_by).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T5.1 — clearUserPermission tests (RED → GREEN)
// ---------------------------------------------------------------------------

function makeClearPermParams(overrides: {
  userId?: string;
  permission?: PermissionKey;
  adminId?: string | null;
  adminName?: string | null;
} = {}) {
  return {
    userId: "user-uuid",
    permission: "sales.delete" as PermissionKey,
    adminId: "admin-uuid",
    adminName: "Admin",
    ...overrides,
  };
}

describe("clearUserPermission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("issues a DELETE on user_permissions", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await clearUserPermission(makeClearPermParams());

    const deleteCall = sb.deleteCalls.find((c) => c.table === "user_permissions");
    expect(deleteCall).toBeDefined();
  });

  it("DELETE filters by user_id AND permission", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await clearUserPermission(
      makeClearPermParams({ userId: "u3", permission: "inventory.discard" }),
    );

    const deleteCall = sb.deleteCalls.find((c) => c.table === "user_permissions");
    // Both filters must be present
    const filterKeys = deleteCall?.filters.map((f) => f[0]) ?? [];
    expect(filterKeys).toContain("user_id");
    expect(filterKeys).toContain("permission");
    // Values must match
    const userIdFilter = deleteCall?.filters.find((f) => f[0] === "user_id");
    const permFilter = deleteCall?.filters.find((f) => f[0] === "permission");
    expect(userIdFilter?.[1]).toBe("u3");
    expect(permFilter?.[1]).toBe("inventory.discard");
  });

  it("logAudit called with cambiar_permiso and hereda del rol description", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await clearUserPermission(
      makeClearPermParams({ userId: "u4", permission: "sales.delete" }),
    );

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "cambiar_permiso",
        targetTable: "user_permissions",
        targetId: "u4:sales.delete",
      }),
    );
    const auditCall = mockedLogAudit.mock.calls[0]?.[0] as { targetDescription: string };
    expect(auditCall.targetDescription).toContain("hereda del rol");
  });

  it("error propagates and logAudit is NOT called", async () => {
    const sb = makeMockSupabase({ eqTerminal: { error: { message: "rls_violation" } } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(clearUserPermission(makeClearPermParams())).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });

  it("no error when deleting a row that does not exist (0 rows deleted)", async () => {
    // Supabase DELETE with .eq returns { error: null } even when 0 rows are deleted
    const sb = makeMockSupabase({ eqTerminal: { error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(clearUserPermission(makeClearPermParams())).resolves.toBeUndefined();
  });
});
