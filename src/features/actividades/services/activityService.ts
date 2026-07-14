import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import type { CreateActivity, UpdateActivity } from "@/types";

// Normalize scheduling fields so only the ones relevant to the chosen
// frequency are sent — the DB CHECKs reject inconsistent combinations.
function schedulingArgs(params: CreateActivity) {
  return {
    p_days_of_week: params.frequency === "weekly" ? params.days_of_week ?? null : null,
    p_interval_days: params.frequency === "interval" ? params.interval_days ?? null : null,
    p_anchor_date: params.frequency === "interval" ? params.anchor_date ?? null : null,
  };
}

async function upsertActivity(
  activityId: number | null,
  params: CreateActivity
): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("upsert_activity_with_assignments", {
    p_activity_id: activityId,
    p_title: params.title,
    p_description: params.description ?? null,
    p_category: params.category,
    p_frequency: params.frequency,
    p_sort_order: params.sort_order ?? 0,
    p_assignee_ids: params.assignee_ids,
    ...schedulingArgs(params),
  });

  if (error) throw error;
  return data as number;
}

export async function createActivity(
  params: CreateActivity,
  adminId: string | null,
  adminName: string | null
): Promise<number> {
  const id = await upsertActivity(null, params);

  logAudit({
    userId: adminId,
    userName: adminName,
    action: "crear",
    targetTable: "activities",
    targetId: id,
    targetDescription: `Actividad "${params.title}" creada`,
  });

  return id;
}

export async function updateActivity(
  params: UpdateActivity,
  adminId: string | null,
  adminName: string | null
): Promise<number> {
  const id = await upsertActivity(params.id, params);

  logAudit({
    userId: adminId,
    userName: adminName,
    action: "actualizar",
    targetTable: "activities",
    targetId: id,
    targetDescription: `Actividad "${params.title}" actualizada`,
  });

  return id;
}

// Soft-delete: keeps task_completions history intact (a hard delete would
// cascade and wipe completion records).
export async function deleteActivity(
  activityId: number,
  adminId: string | null,
  adminName: string | null,
  title: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("activities")
    .update({ is_active: false })
    .eq("id", activityId);

  if (error) throw error;

  logAudit({
    userId: adminId,
    userName: adminName,
    action: "eliminar",
    targetTable: "activities",
    targetId: activityId,
    targetDescription: `Actividad "${title}" eliminada`,
  });
}

export async function toggleTaskCompletion(params: {
  activityId: number;
  userId: string;
  date: string;
  isCompleted: boolean;
}): Promise<void> {
  const supabase = createClient();

  if (params.isCompleted) {
    // Uncomplete: delete this user's completion for the day.
    const { error } = await supabase
      .from("task_completions")
      .delete()
      .eq("activity_id", params.activityId)
      .eq("user_id", params.userId)
      .eq("completion_date", params.date);

    if (error) throw error;
  } else {
    // Complete: insert this user's completion for the day.
    const { error } = await supabase.from("task_completions").insert({
      activity_id: params.activityId,
      user_id: params.userId,
      completion_date: params.date,
      completed_by: params.userId,
    });

    if (error) throw error;
  }
}
