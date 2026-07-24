import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createTimeOffRequest,
  approveTimeOffRequest,
  rejectTimeOffRequest,
} from "./timeOffRequestsService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);

describe("createTimeOffRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("isFullDay=true: start/end nulls", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createTimeOffRequest({
      userId: "u1",
      requestedDate: "2026-05-10",
      isFullDay: true,
      startTime: "09:00",
      endTime: "17:00",
      hoursRequested: 8,
      reason: "Cita médica",
    });

    const insert = sb.insertCalls.find((c) => c.table === "time_off_requests")!;
    const payload = insert.payload as Record<string, unknown>;
    expect(payload.start_time).toBeNull();
    expect(payload.end_time).toBeNull();
    expect(payload.hours_requested).toBe(8);
  });

  it("isFullDay=false: preserva start/end", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createTimeOffRequest({
      userId: "u1",
      requestedDate: "2026-05-10",
      isFullDay: false,
      startTime: "10:00",
      endTime: "12:00",
      hoursRequested: 2,
      reason: null,
    });

    const insert = sb.insertCalls.find((c) => c.table === "time_off_requests")!;
    const payload = insert.payload as Record<string, unknown>;
    expect(payload.start_time).toBe("10:00");
    expect(payload.end_time).toBe("12:00");
  });
});

describe("approveTimeOffRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("llama RPC approve_time_off_request + audit", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await approveTimeOffRequest({
      requestId: 7,
      adminId: "admin-uuid",
      adminName: "Admin",
      employeeName: "Seba",
      requestedDate: "2026-05-10",
      hoursRequested: 8,
      reviewNote: "OK",
    });

    expect(sb.rpcCalls).toEqual([
      {
        fn: "approve_time_off_request",
        params: {
          p_request_id: 7,
          p_admin_id: "admin-uuid",
          p_review_note: "OK",
        },
      },
    ]);
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "aprobar_permiso",
        targetId: 7,
      }),
    );
  });

  it("error en RPC: propaga sin audit", async () => {
    const sb = makeMockSupabase();
    sb.setRpcResult("approve_time_off_request", {
      error: { message: "denied" },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      approveTimeOffRequest({
        requestId: 1,
        adminId: "x",
        adminName: null,
        employeeName: "Seba",
        requestedDate: "2026-05-10",
        hoursRequested: 8,
        reviewNote: null,
      }),
    ).rejects.toBeTruthy();
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });
});

describe("rejectTimeOffRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a pending request: UPDATE carries status=rechazado + eq(status,pendiente) + audit", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await rejectTimeOffRequest({
      requestId: 5,
      adminId: "admin",
      adminName: "Admin",
      employeeName: "Seba",
      requestedDate: "2026-05-12",
      reviewNote: "Cubrimos turno",
    });

    const update = sb.updateCalls.find((c) => c.table === "time_off_requests")!;
    const payload = update.payload as Record<string, unknown>;
    expect(payload.status).toBe("rechazado");
    expect(payload.reviewed_by).toBe("admin");
    expect(payload.review_note).toBe("Cubrimos turno");
    // Must filter by both id AND status so only pending requests are affected
    expect(update.filters).toContainEqual(["id", 5]);
    expect(update.filters).toContainEqual(["status", "pendiente"]);

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "rechazar_permiso" }),
    );
  });

  it("throws 'La solicitud ya fue procesada' when 0 rows affected (already processed)", async () => {
    const sb = makeMockSupabase();
    // Simulate conditional UPDATE finding 0 rows (request already approved/rejected)
    sb.setUpdateSelectResult("time_off_requests", { data: [], error: null });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      rejectTimeOffRequest({
        requestId: 5,
        adminId: "admin",
        adminName: "Admin",
        employeeName: "Seba",
        requestedDate: "2026-05-12",
        reviewNote: null,
      }),
    ).rejects.toThrow("La solicitud ya fue procesada");

    // Must NOT fire audit when blocked
    expect(mockedLogAudit).not.toHaveBeenCalled();
  });

  it("supabase error propagates without audit", async () => {
    const sb = makeMockSupabase();
    sb.setUpdateSelectResult("time_off_requests", {
      data: null,
      error: { message: "connection error" },
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      rejectTimeOffRequest({
        requestId: 5,
        adminId: "admin",
        adminName: null,
        employeeName: "Seba",
        requestedDate: "2026-05-12",
        reviewNote: null,
      }),
    ).rejects.toBeTruthy();

    expect(mockedLogAudit).not.toHaveBeenCalled();
  });
});
