import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteWithAudit } from "./deleteWithAudit";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";

vi.mock("@/utils/supabase/client", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/utils/auditLog", () => ({
  logAudit: vi.fn(),
}));

function buildMockClient(deleteResult: { error: { message: string } | null } = { error: null }) {
  const eq = vi.fn().mockResolvedValue(deleteResult);
  const del = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ delete: del }));
  return { client: { from }, from, delete: del, eq };
}

describe("deleteWithAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the row and logs an audit on success", async () => {
    const mock = buildMockClient({ error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    await deleteWithAudit({
      table: "sales",
      id: 42,
      userId: "user-1",
      userName: "Seba",
      auditTable: "sales",
      description: "Venta #42",
    });

    expect(mock.from).toHaveBeenCalledWith("sales");
    expect(mock.delete).toHaveBeenCalled();
    expect(mock.eq).toHaveBeenCalledWith("id", 42);
    expect(logAudit).toHaveBeenCalledWith({
      userId: "user-1",
      userName: "Seba",
      action: "eliminar",
      targetTable: "sales",
      targetId: 42,
      targetDescription: "Venta #42",
    });
  });

  it("throws with prefixed message when delete fails", async () => {
    const mock = buildMockClient({ error: { message: "RLS denied" } });
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    await expect(
      deleteWithAudit({
        table: "sales",
        id: 1,
        userId: null,
        userName: null,
        auditTable: "sales",
        description: "x",
      }),
    ).rejects.toThrow("Error al eliminar: RLS denied");
  });

  it("does NOT call logAudit when delete fails", async () => {
    const mock = buildMockClient({ error: { message: "boom" } });
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    await expect(
      deleteWithAudit({
        table: "sales",
        id: 1,
        userId: null,
        userName: null,
        auditTable: "sales",
        description: "x",
      }),
    ).rejects.toThrow();

    expect(logAudit).not.toHaveBeenCalled();
  });

  it("forwards null userId/userName to the audit log", async () => {
    const mock = buildMockClient({ error: null });
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    await deleteWithAudit({
      table: "categories",
      id: 5,
      userId: null,
      userName: null,
      auditTable: "categories",
      description: "Postres",
    });

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        userName: null,
        action: "eliminar",
      }),
    );
  });
});
