import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CreateActivity, UpdateActivity } from "@/types";
import {
  createActivity,
  updateActivity,
  deleteActivity,
  toggleTaskCompletion,
} from "./activityService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);

describe("createActivity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls the upsert RPC with p_activity_id null, weekly days, assignees; audits 'crear'", async () => {
    const sb = makeMockSupabase({ rpc: { data: 42, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    const params: CreateActivity = {
      title: "Calibrar espresso",
      description: "Ajustar molienda y tiempo de extracción",
      category: "apertura",
      frequency: "weekly",
      days_of_week: [0, 2, 4],
      assignee_ids: ["u1", "u2"],
    };

    const id = await createActivity(params, "admin", "Admin");

    expect(id).toBe(42);
    const call = sb.rpcCalls.find((c) => c.fn === "upsert_activity_with_assignments")!;
    expect(call.params).toMatchObject({
      p_activity_id: null,
      p_title: "Calibrar espresso",
      p_description: "Ajustar molienda y tiempo de extracción",
      p_category: "apertura",
      p_frequency: "weekly",
      p_days_of_week: [0, 2, 4],
      p_interval_days: null,
      p_anchor_date: null,
      p_assignee_ids: ["u1", "u2"],
    });
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crear",
        targetTable: "activities",
        targetDescription: expect.stringContaining("Calibrar espresso"),
      })
    );
  });

  it("normalizes interval fields and clears weekly days for interval frequency", async () => {
    const sb = makeMockSupabase({ rpc: { data: 7, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    const params: CreateActivity = {
      title: "Limpieza profunda",
      category: "cierre",
      frequency: "interval",
      interval_days: 3,
      anchor_date: "2026-07-13",
      days_of_week: [1, 2], // should be ignored/cleared for interval
      assignee_ids: ["u1"],
    };

    await createActivity(params, "admin", "Admin");

    const call = sb.rpcCalls[0];
    expect(call.params).toMatchObject({
      p_frequency: "interval",
      p_interval_days: 3,
      p_anchor_date: "2026-07-13",
      p_days_of_week: null,
    });
  });

  it("clears schedule fields for on_demand", async () => {
    const sb = makeMockSupabase({ rpc: { data: 8, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createActivity(
      {
        title: "Reponer servilletas",
        category: "jornada",
        frequency: "on_demand",
        days_of_week: [1],
        interval_days: 2,
        anchor_date: "2026-07-13",
        assignee_ids: ["u1"],
      },
      "admin",
      "Admin"
    );

    expect(sb.rpcCalls[0].params).toMatchObject({
      p_frequency: "on_demand",
      p_days_of_week: null,
      p_interval_days: null,
      p_anchor_date: null,
    });
  });

  it("throws when the RPC returns an error", async () => {
    const sb = makeMockSupabase({ rpc: { data: null, error: { message: "no admin" } } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await expect(
      createActivity(
        { title: "x", category: "apertura", frequency: "daily", assignee_ids: [] },
        "admin",
        "Admin"
      )
    ).rejects.toBeTruthy();
  });
});

describe("updateActivity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes the activity id to the RPC and audits 'actualizar'", async () => {
    const sb = makeMockSupabase({ rpc: { data: 50, error: null } });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    const params: UpdateActivity = {
      id: 50,
      title: "Nuevo título",
      category: "jornada",
      frequency: "daily",
      assignee_ids: ["u1"],
    };

    await updateActivity(params, "admin", "Admin");

    expect(sb.rpcCalls[0].params).toMatchObject({ p_activity_id: 50, p_title: "Nuevo título" });
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "actualizar", targetId: 50, targetTable: "activities" })
    );
  });
});

describe("deleteActivity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("soft-deletes (is_active=false) and audits 'eliminar'", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await deleteActivity(30, "admin", "Admin", "Cerrar caja");

    expect(sb.updateCalls[0]).toMatchObject({
      table: "activities",
      payload: { is_active: false },
      filters: [["id", 30]],
    });
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "eliminar",
        targetTable: "activities",
        targetId: 30,
        targetDescription: expect.stringContaining("Cerrar caja"),
      })
    );
  });
});

describe("toggleTaskCompletion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uncomplete: deletes scoped by activity_id + user_id + completion_date", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await toggleTaskCompletion({
      activityId: 7,
      userId: "u1",
      date: "2026-07-14",
      isCompleted: true,
    });

    expect(sb.deleteCalls[0]).toMatchObject({ table: "task_completions" });
    expect(sb.deleteCalls[0].filters).toEqual([
      ["activity_id", 7],
      ["user_id", "u1"],
      ["completion_date", "2026-07-14"],
    ]);
    expect(sb.insertCalls).toHaveLength(0);
  });

  it("complete: inserts a completion with activity_id/user_id/date/completed_by", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await toggleTaskCompletion({
      activityId: 7,
      userId: "u1",
      date: "2026-07-14",
      isCompleted: false,
    });

    const insert = sb.insertCalls.find((c) => c.table === "task_completions")!;
    expect(insert.payload).toMatchObject({
      activity_id: 7,
      user_id: "u1",
      completion_date: "2026-07-14",
      completed_by: "u1",
    });
    expect(sb.deleteCalls).toHaveLength(0);
  });
});
