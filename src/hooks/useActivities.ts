"use client";

import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  Activity,
  TaskCompletion,
  TodayTask,
  EmployeeTodayTasks,
  ActivityWithAssignees,
  Assignee,
  TaskCategory,
} from "@/types";
import { CATEGORY_ORDER } from "@/features/actividades/constants";
import { isActivityScheduledForDate, isOnDemand } from "@/features/actividades/frequency";

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

interface AssignmentRow {
  activity_id: number;
  user_id: string;
  user: { full_name: string | null; role: string | null; is_active: boolean | null } | null;
}

interface ActivitiesData {
  myTasks: TodayTask[];
  allEmployeeTasks: EmployeeTodayTasks[];
  catalog: ActivityWithAssignees[];
  users: { id: string; full_name: string | null; role: string | null }[];
}

function sortByCategory<T extends { category: string; sort_order: number | null }>(arr: T[]): T[] {
  return arr.sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category as TaskCategory);
    const catB = CATEGORY_ORDER.indexOf(b.category as TaskCategory);
    if (catA !== catB) return catA - catB;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

const fetchActivities = async (
  isAdmin: boolean,
  userId: string | undefined
): Promise<ActivitiesData> => {
  const supabase = createClient();
  const today = getTodayStr();

  const { data: activities, error: aErr } = await supabase
    .from("activities")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (aErr) throw new Error(aErr.message);

  const { data: rawAssignments, error: asErr } = await supabase
    .from("activity_assignments")
    .select(
      "activity_id, user_id, user:user_profiles!activity_assignments_user_id_fkey (full_name, role, is_active)"
    );
  if (asErr) throw new Error(asErr.message);

  let compQuery = supabase.from("task_completions").select("*").eq("completion_date", today);
  if (!isAdmin && userId) {
    compQuery = compQuery.eq("user_id", userId);
  }
  const { data: completions, error: cErr } = await compQuery;
  if (cErr) throw new Error(cErr.message);

  const activityMap = new Map<number, Activity>();
  for (const a of activities ?? []) activityMap.set(a.id, a);

  // Only assignments to active users, and to activities that still exist (active).
  const assignments = ((rawAssignments ?? []) as unknown as AssignmentRow[]).filter(
    (as) => as.user?.is_active !== false && activityMap.has(as.activity_id)
  );

  const countByActivity = new Map<number, number>();
  for (const as of assignments) {
    countByActivity.set(as.activity_id, (countByActivity.get(as.activity_id) ?? 0) + 1);
  }

  const completionMap = new Map<string, TaskCompletion>();
  for (const c of completions ?? []) {
    completionMap.set(`${c.activity_id}:${c.user_id}`, c);
  }

  const makeTask = (activity: Activity, uid: string): TodayTask => {
    const comp = completionMap.get(`${activity.id}:${uid}`);
    return {
      ...activity,
      assignee_id: uid,
      is_completed: !!comp,
      completion_id: comp?.id ?? null,
      shared: (countByActivity.get(activity.id) ?? 0) > 1,
    };
  };

  const appliesToday = (activity: Activity) =>
    isOnDemand(activity) || isActivityScheduledForDate(activity, today);

  const myTasks: TodayTask[] = [];
  const userMap = new Map<string, { name: string; role: string; tasks: TodayTask[] }>();

  for (const as of assignments) {
    const activity = activityMap.get(as.activity_id)!;
    if (!appliesToday(activity)) continue;

    const task = makeTask(activity, as.user_id);
    if (as.user_id === userId) myTasks.push(task);

    if (!userMap.has(as.user_id)) {
      userMap.set(as.user_id, {
        name: as.user?.full_name ?? "Sin nombre",
        role: as.user?.role ?? "",
        tasks: [],
      });
    }
    userMap.get(as.user_id)!.tasks.push(task);
  }

  sortByCategory(myTasks);

  const allEmployeeTasks: EmployeeTodayTasks[] = [];
  for (const [uid, data] of userMap) {
    sortByCategory(data.tasks);
    const scheduled = data.tasks.filter((t) => !isOnDemand(t));
    allEmployeeTasks.push({
      user_id: uid,
      user_name: data.name,
      user_role: data.role,
      tasks: data.tasks,
      completed_count: scheduled.filter((t) => t.is_completed).length,
      total_count: scheduled.length,
    });
  }
  allEmployeeTasks.sort((a, b) => a.user_name.localeCompare(b.user_name, "es"));

  // Full catalog with assignees (admin management view)
  const assigneesByActivity = new Map<number, Assignee[]>();
  for (const as of assignments) {
    const list = assigneesByActivity.get(as.activity_id) ?? [];
    list.push({ id: as.user_id, name: as.user?.full_name ?? "Sin nombre", role: as.user?.role ?? null });
    assigneesByActivity.set(as.activity_id, list);
  }
  const catalog: ActivityWithAssignees[] = sortByCategory(
    (activities ?? []).map((a) => ({
      ...a,
      assignees: (assigneesByActivity.get(a.id) ?? []).sort((x, y) =>
        x.name.localeCompare(y.name, "es")
      ),
    }))
  );

  const { data: users } = await supabase
    .from("user_profiles")
    .select("id, full_name, role")
    .eq("is_active", true)
    .neq("role", "admin")
    .order("full_name");

  return { myTasks, allEmployeeTasks, catalog, users: users ?? [] };
};

export const useActivities = () => {
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<ActivitiesData>(
    authLoading ? null : ["activities", isAdmin, user?.id],
    () => fetchActivities(isAdmin, user?.id)
  );

  return {
    myTasks: data?.myTasks ?? [],
    allEmployeeTasks: data?.allEmployeeTasks ?? [],
    catalog: data?.catalog ?? [],
    users: data?.users ?? [],
    error,
    isLoading: authLoading || isLoading,
    mutate,
  };
};
