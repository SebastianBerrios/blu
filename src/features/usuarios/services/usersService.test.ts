import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  updateProfile,
  setUserRole,
  toggleUserActive,
} from "./usersService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);

describe("updateProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("trim del fullName + update con id", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await updateProfile({ userId: "uuid-1", fullName: "  Sebastián  " });

    expect(sb.updateCalls[0]).toMatchObject({
      table: "user_profiles",
      payload: { full_name: "Sebastián" },
      filters: [["id", "uuid-1"]],
    });
  });
});

describe("setUserRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("update role + audit con detalles del cambio", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setUserRole({
      targetUserId: "uuid-2",
      targetDisplayName: "Ana",
      previousRole: "barista",
      newRole: "admin",
      adminId: "admin-uuid",
      adminName: "Admin",
      currentUserId: "admin-uuid",
    });

    const update = sb.updateCalls.find((c) => c.table === "user_profiles")!;
    expect((update.payload as Record<string, unknown>).role).toBe("admin");

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "cambiar_rol",
        targetId: "uuid-2",
        details: { rol_anterior: "barista", rol_nuevo: "admin" },
      }),
    );
  });

  it("admin can assign admin role to themselves (promote is allowed)", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    // Self-assign admin role: should NOT throw
    await expect(
      setUserRole({
        targetUserId: "admin-uuid",
        targetDisplayName: "Me",
        previousRole: "barista",
        newRole: "admin",
        adminId: "admin-uuid",
        adminName: "Admin",
        currentUserId: "admin-uuid",
      }),
    ).resolves.toBeUndefined();
  });

  it("throws when admin tries to self-demote to non-admin role", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      setUserRole({
        targetUserId: "admin-uuid",
        targetDisplayName: "Me",
        previousRole: "admin",
        newRole: "barista",
        adminId: "admin-uuid",
        adminName: "Admin",
        currentUserId: "admin-uuid",
      }),
    ).rejects.toThrow("No puedes cambiar tu propio rol de administrador");

    // Must not hit supabase or audit
    expect(sb.updateCalls).toHaveLength(0);
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });

  it("admin can edit another user's role (even another admin)", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      setUserRole({
        targetUserId: "other-admin-uuid",
        targetDisplayName: "OtherAdmin",
        previousRole: "admin",
        newRole: "barista",
        adminId: "admin-uuid",
        adminName: "Admin",
        currentUserId: "admin-uuid",
      }),
    ).resolves.toBeUndefined();

    expect(sb.updateCalls).toHaveLength(1);
  });
});

describe("toggleUserActive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("activación: descripción dice 'activado'", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await toggleUserActive({
      targetUserId: "uuid-3",
      targetDisplayName: "Luis",
      previousActive: false,
      newActive: true,
      adminId: "admin",
      adminName: "Admin",
      currentUserId: "admin",
    });

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        targetDescription: expect.stringContaining("activado"),
      }),
    );
  });

  it("desactivación: descripción dice 'desactivado'", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await toggleUserActive({
      targetUserId: "uuid-3",
      targetDisplayName: "Luis",
      previousActive: true,
      newActive: false,
      adminId: "admin",
      adminName: null,
      currentUserId: "admin",
    });

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        targetDescription: expect.stringContaining("desactivado"),
      }),
    );
  });

  it("throws when admin tries to deactivate themselves", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      toggleUserActive({
        targetUserId: "admin-uuid",
        targetDisplayName: "Admin",
        previousActive: true,
        newActive: false,
        adminId: "admin-uuid",
        adminName: "Admin",
        currentUserId: "admin-uuid",
      }),
    ).rejects.toThrow("No puedes desactivar tu propia cuenta");

    expect(sb.updateCalls).toHaveLength(0);
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });

  it("admin can activate themselves (self-activate is allowed)", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      toggleUserActive({
        targetUserId: "admin-uuid",
        targetDisplayName: "Admin",
        previousActive: false,
        newActive: true,
        adminId: "admin-uuid",
        adminName: "Admin",
        currentUserId: "admin-uuid",
      }),
    ).resolves.toBeUndefined();
  });

  it("admin can deactivate another user", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      toggleUserActive({
        targetUserId: "other-uuid",
        targetDisplayName: "Other",
        previousActive: true,
        newActive: false,
        adminId: "admin-uuid",
        adminName: "Admin",
        currentUserId: "admin-uuid",
      }),
    ).resolves.toBeUndefined();

    expect(sb.updateCalls).toHaveLength(1);
  });
});
