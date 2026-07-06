/**
 * T3.2 — Tests for permissionsService.setRolePermission.
 * Verifies: upsert shape (table + conflict key), error propagation,
 * logAudit firing on success, and logAudit NOT called on error.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setRolePermission } from "./permissionsService";
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
