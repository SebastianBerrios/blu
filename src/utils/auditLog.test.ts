import { describe, it, expect, vi, beforeEach } from "vitest";
import { logAudit } from "./auditLog";
import { createClient } from "@/utils/supabase/client";

vi.mock("@/utils/supabase/client", () => ({
  createClient: vi.fn(),
}));

function buildMockClient(insertResult: { error: unknown } = { error: null }) {
  const insert = vi.fn().mockResolvedValue(insertResult);
  const from = vi.fn(() => ({ insert }));
  return { client: { from }, from, insert };
}

describe("logAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a row into audit_logs with all fields mapped", async () => {
    const mock = buildMockClient();
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    await logAudit({
      userId: "user-uuid-123",
      userName: "Sebastián",
      action: "crear_venta",
      targetTable: "sales",
      targetId: 42,
      targetDescription: "Venta #42 - Mesa 1",
      details: { total: 50, productos: 3 },
    });

    expect(mock.from).toHaveBeenCalledWith("audit_logs");
    expect(mock.insert).toHaveBeenCalledWith({
      user_id: "user-uuid-123",
      user_name: "Sebastián",
      action: "crear_venta",
      target_table: "sales",
      target_id: "42",
      target_description: "Venta #42 - Mesa 1",
      details: { total: 50, productos: 3 },
    });
  });

  it("converts numeric targetId to string", async () => {
    const mock = buildMockClient();
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    await logAudit({
      userId: null,
      userName: null,
      action: "actualizar",
      targetTable: "products",
      targetId: 7,
    });

    const payload = mock.insert.mock.calls[0][0] as { target_id: string };
    expect(payload.target_id).toBe("7");
  });

  it("preserves string targetId", async () => {
    const mock = buildMockClient();
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    await logAudit({
      userId: null,
      userName: null,
      action: "eliminar",
      targetTable: "categories",
      targetId: "abc-123",
    });

    const payload = mock.insert.mock.calls[0][0] as { target_id: string };
    expect(payload.target_id).toBe("abc-123");
  });

  it("sets target_id to null when missing", async () => {
    const mock = buildMockClient();
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    await logAudit({
      userId: null,
      userName: null,
      action: "crear_venta",
      targetTable: "sales",
    });

    const payload = mock.insert.mock.calls[0][0] as { target_id: string | null };
    expect(payload.target_id).toBeNull();
  });

  it("defaults target_description to null and details to {}", async () => {
    const mock = buildMockClient();
    vi.mocked(createClient).mockReturnValue(mock.client as never);

    await logAudit({
      userId: null,
      userName: null,
      action: "crear_venta",
      targetTable: "sales",
    });

    const payload = mock.insert.mock.calls[0][0] as {
      target_description: string | null;
      details: Record<string, unknown>;
    };
    expect(payload.target_description).toBeNull();
    expect(payload.details).toEqual({});
  });

  it("does not throw when supabase rejects (fire-and-forget)", async () => {
    const insert = vi.fn().mockRejectedValue(new Error("network down"));
    const from = vi.fn(() => ({ insert }));
    vi.mocked(createClient).mockReturnValue({ from } as never);

    await expect(
      logAudit({
        userId: null,
        userName: null,
        action: "crear_venta",
        targetTable: "sales",
      }),
    ).resolves.toBeUndefined();
  });

  it("does not throw when createClient itself throws", async () => {
    vi.mocked(createClient).mockImplementation(() => {
      throw new Error("client init failed");
    });

    await expect(
      logAudit({
        userId: null,
        userName: null,
        action: "crear_venta",
        targetTable: "sales",
      }),
    ).resolves.toBeUndefined();
  });
});
