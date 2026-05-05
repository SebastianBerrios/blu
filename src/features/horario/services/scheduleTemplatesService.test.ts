import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deleteTemplate,
  getExistingTemplates,
  deleteTemplatesForDays,
  createTemplates,
  updateTemplate,
} from "./scheduleTemplatesService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { deleteWithAudit } from "@/utils/helpers/deleteWithAudit";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));
vi.mock("@/utils/helpers/deleteWithAudit", () => ({ deleteWithAudit: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);
const mockedDeleteWithAudit = vi.mocked(deleteWithAudit);

describe("deleteTemplate", () => {
  beforeEach(() => vi.clearAllMocks());
  it("delega a deleteWithAudit", async () => {
    await deleteTemplate(15, "u1", "Seba");
    expect(mockedDeleteWithAudit).toHaveBeenCalledWith({
      table: "schedule_templates",
      id: 15,
      userId: "u1",
      userName: "Seba",
      auditTable: "schedule_templates",
      description: "Turno eliminado",
    });
  });
});

describe("getExistingTemplates", () => {
  beforeEach(() => vi.clearAllMocks());
  it("query con .eq(user_id) e .in(day_of_week)", async () => {
    const sb = makeMockSupabase();
    sb.setResult("schedule_templates", {
      data: [{ id: 1, day_of_week: 0 }],
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    const result = await getExistingTemplates("u1", [0, 2]);
    expect(result).toEqual([{ id: 1, day_of_week: 0 }]);
    expect(sb.selectCalls[0].filters).toEqual([
      ["user_id", "u1"],
      ["day_of_week", [0, 2]],
    ]);
  });

  it("retorna [] cuando data es null", async () => {
    const sb = makeMockSupabase();
    sb.setResult("schedule_templates", { data: null, error: null });
    vi.mocked(createClient).mockReturnValue(sb.client as never);
    expect(await getExistingTemplates("u1", [0])).toEqual([]);
  });
});

describe("deleteTemplatesForDays", () => {
  beforeEach(() => vi.clearAllMocks());
  it("delete con filters .eq(user_id) e .in(day_of_week) + audit", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await deleteTemplatesForDays("u1", [0, 1], "admin", "Admin", "Seba");

    const del = sb.deleteCalls[0];
    expect(del.table).toBe("schedule_templates");
    expect(del.filters).toEqual([
      ["user_id", "u1"],
      ["day_of_week", [0, 1]],
    ]);
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "eliminar",
        targetTable: "schedule_templates",
      }),
    );
  });
});

describe("createTemplates", () => {
  beforeEach(() => vi.clearAllMocks());
  it("inserta una fila por día + audit con day labels", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await createTemplates({
      userId: "u1",
      days: [0, 1, 2],
      startTime: "09:00",
      endTime: "17:00",
      adminId: "admin",
      adminName: "Admin",
      employeeName: "Seba",
    });

    const insert = sb.insertCalls.find((c) => c.table === "schedule_templates")!;
    const rows = insert.payload as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      user_id: "u1",
      day_of_week: 0,
      start_time: "09:00",
      end_time: "17:00",
    });

    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        targetDescription: expect.stringContaining("Lunes, Martes, Miércoles"),
      }),
    );
  });
});

describe("updateTemplate", () => {
  beforeEach(() => vi.clearAllMocks());
  it("update + audit con DAY_LABELS", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await updateTemplate({
      templateId: 50,
      userId: "u1",
      dayOfWeek: 4,
      startTime: "10:00",
      endTime: "14:00",
      adminId: "admin",
      adminName: "Admin",
      employeeName: "Seba",
    });

    expect(sb.updateCalls[0]).toMatchObject({
      table: "schedule_templates",
      filters: [["id", 50]],
    });
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "actualizar",
        targetId: 50,
        targetDescription: expect.stringContaining("Viernes"),
      }),
    );
  });
});
