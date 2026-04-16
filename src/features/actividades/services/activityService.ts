import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { deleteWithAudit } from "@/utils/helpers/deleteWithAudit";
import type { CreateEmployeeTask, UpdateEmployeeTask } from "@/types";

export async function createTask(
  params: CreateEmployeeTask,
  adminId: string | null,
  adminName: string | null
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("employee_tasks").insert({
    user_id: params.user_id,
    title: params.title,
    category: params.category,
    frequency: params.frequency,
    days_of_week: params.days_of_week ?? null,
    sort_order: params.sort_order ?? 0,
  });

  if (error) throw error;

  logAudit({
    userId: adminId,
    userName: adminName,
    action: "crear",
    targetTable: "employee_tasks",
    targetDescription: `Tarea "${params.title}" creada`,
  });
}

export async function updateTask(
  taskId: number,
  params: UpdateEmployeeTask,
  adminId: string | null,
  adminName: string | null
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("employee_tasks")
    .update(params)
    .eq("id", taskId);

  if (error) throw error;

  logAudit({
    userId: adminId,
    userName: adminName,
    action: "actualizar",
    targetTable: "employee_tasks",
    targetId: taskId,
    targetDescription: `Tarea actualizada`,
  });
}

export async function deleteTask(
  taskId: number,
  adminId: string | null,
  adminName: string | null,
  taskTitle: string
): Promise<void> {
  await deleteWithAudit({
    table: "employee_tasks",
    id: taskId,
    userId: adminId,
    userName: adminName,
    auditTable: "employee_tasks",
    description: `Tarea "${taskTitle}" eliminada`,
  });
}

export async function toggleTaskCompletion(params: {
  taskId: number;
  userId: string;
  date: string;
  isCompleted: boolean;
}): Promise<void> {
  const supabase = createClient();

  if (params.isCompleted) {
    // Uncomplete: delete the completion
    const { error } = await supabase
      .from("task_completions")
      .delete()
      .eq("task_id", params.taskId)
      .eq("completion_date", params.date);

    if (error) throw error;
  } else {
    // Complete: insert completion
    const { error } = await supabase.from("task_completions").insert({
      task_id: params.taskId,
      user_id: params.userId,
      completion_date: params.date,
      completed_by: params.userId,
    });

    if (error) throw error;
  }
}
