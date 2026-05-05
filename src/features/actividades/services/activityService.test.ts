import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CreateEmployeeTask, UpdateEmployeeTask } from "@/types";
import {
  createTask,
  updateTask,
  deleteTask,
  toggleTaskCompletion,
} from "./activityService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { deleteWithAudit } from "@/utils/helpers/deleteWithAudit";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));
vi.mock("@/utils/helpers/deleteWithAudit", () => ({ deleteWithAudit: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);
const mockedDeleteWithAudit = vi.mocked(deleteWithAudit);

describe("createTask", () => {
  beforeEach(() => vi.clearAllMocks());

  it("insert con sort_order default 0 si no se provee + audit", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    const params: CreateEmployeeTask = {
      user_id: "u1",
      title: "Limpiar máquina",
      category: "cierre",
      frequency: "daily",
      days_of_week: null,
      sort_order: undefined,
    } as CreateEmployeeTask;

    await createTask(params, "admin", "Admin");

    const insert = sb.insertCalls.find((c) => c.table === "employee_tasks")!;
    expect((insert.payload as Record<string, unknown>).sort_order).toBe(0);
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crear",
        targetDescription: expect.stringContaining("Limpiar máquina"),
      }),
    );
  });
});

describe("updateTask", () => {
  beforeEach(() => vi.clearAllMocks());

  it("update + audit con id", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await updateTask(50, { title: "Nuevo título" } as UpdateEmployeeTask, "admin", "Admin");

    expect(sb.updateCalls[0]).toMatchObject({
      table: "employee_tasks",
      filters: [["id", 50]],
    });
    expect(mockedLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "actualizar", targetId: 50 }),
    );
  });
});

describe("deleteTask", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delega a deleteWithAudit", async () => {
    await deleteTask(30, "admin", "Admin", "Cerrar caja");
    expect(mockedDeleteWithAudit).toHaveBeenCalledWith({
      table: "employee_tasks",
      id: 30,
      userId: "admin",
      userName: "Admin",
      auditTable: "employee_tasks",
      description: 'Tarea "Cerrar caja" eliminada',
    });
  });
});

describe("toggleTaskCompletion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("isCompleted=true (uncomplete): delete con task_id + completion_date", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await toggleTaskCompletion({
      taskId: 7,
      userId: "u1",
      date: "2026-05-15",
      isCompleted: true,
    });

    expect(sb.deleteCalls[0]).toMatchObject({ table: "task_completions" });
    expect(sb.deleteCalls[0].filters).toEqual([
      ["task_id", 7],
      ["completion_date", "2026-05-15"],
    ]);
    expect(sb.insertCalls).toHaveLength(0);
  });

  it("isCompleted=false (complete): insert task_completion", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await toggleTaskCompletion({
      taskId: 7,
      userId: "u1",
      date: "2026-05-15",
      isCompleted: false,
    });

    const insert = sb.insertCalls.find((c) => c.table === "task_completions")!;
    expect(insert.payload).toMatchObject({
      task_id: 7,
      user_id: "u1",
      completion_date: "2026-05-15",
      completed_by: "u1",
    });
    expect(sb.deleteCalls).toHaveLength(0);
  });
});
