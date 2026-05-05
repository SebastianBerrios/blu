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
    });

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        targetDescription: expect.stringContaining("desactivado"),
      }),
    );
  });
});
