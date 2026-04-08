"use client";

import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { EmployeeTask, TaskCompletion, TodayTask, EmployeeTodayTasks, TaskCategory } from "@/types";
import { CATEGORY_ORDER } from "@/features/actividades/constants";

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getTodayDayOfWeek(): number {
  const day = new Date().getDay();
  // JS: 0=Sun, 1=Mon...6=Sat → convert to 0=Mon...5=Sat
  return day === 0 ? 6 : day - 1;
}

function isTaskApplicableToday(task: EmployeeTask): boolean {
  const dow = getTodayDayOfWeek();
  if (dow > 5) return false; // Sunday — no work
  if (task.frequency === "daily") return true;
  if (task.frequency === "weekly" && task.days_of_week) {
    return task.days_of_week.includes(dow);
  }
  return false;
}

interface ActivitiesData {
  myTasks: TodayTask[];
  allEmployeeTasks: EmployeeTodayTasks[];
  users: { id: string; full_name: string | null; role: string | null }[];
}

const fetchActivities = async (
  isAdmin: boolean,
  userId: string | undefined
): Promise<ActivitiesData> => {
  const supabase = createClient();
  const today = getTodayStr();

  // Fetch all active tasks with user info
  const { data: tasks, error: tasksError } = await supabase
    .from("employee_tasks")
    .select("*, user:user_profiles!employee_tasks_user_id_fkey (full_name, role)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (tasksError) throw new Error(tasksError.message);

  // Fetch today's completions
  let completionsQuery = supabase
    .from("task_completions")
    .select("*")
    .eq("completion_date", today);

  if (!isAdmin && userId) {
    completionsQuery = completionsQuery.eq("user_id", userId);
  }

  const { data: completions, error: compError } = await completionsQuery;
  if (compError) throw new Error(compError.message);

  const completionMap = new Map<number, TaskCompletion>();
  for (const c of completions ?? []) {
    completionMap.set(c.task_id, c);
  }

  // Build my tasks (employee view)
  const myActiveTasks = (tasks ?? [])
    .filter((t) => t.user_id === userId && isTaskApplicableToday(t))
    .map((t): TodayTask => {
      const completion = completionMap.get(t.id);
      return {
        ...t,
        is_completed: !!completion,
        completion_id: completion?.id ?? null,
      };
    });

  // Sort by category order, then sort_order
  myActiveTasks.sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category as TaskCategory);
    const catB = CATEGORY_ORDER.indexOf(b.category as TaskCategory);
    if (catA !== catB) return catA - catB;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  // Build all employees' tasks (admin view)
  const userMap = new Map<string, { full_name: string; role: string; tasks: TodayTask[] }>();

  for (const t of tasks ?? []) {
    if (!isTaskApplicableToday(t)) continue;
    const user = t.user as unknown as { full_name: string | null; role: string | null } | null;
    if (!userMap.has(t.user_id)) {
      userMap.set(t.user_id, {
        full_name: user?.full_name ?? "Sin nombre",
        role: user?.role ?? "",
        tasks: [],
      });
    }
    const completion = completionMap.get(t.id);
    userMap.get(t.user_id)!.tasks.push({
      ...t,
      is_completed: !!completion,
      completion_id: completion?.id ?? null,
    });
  }

  const allEmployeeTasks: EmployeeTodayTasks[] = [];
  for (const [uid, data] of userMap) {
    data.tasks.sort((a, b) => {
      const catA = CATEGORY_ORDER.indexOf(a.category as TaskCategory);
      const catB = CATEGORY_ORDER.indexOf(b.category as TaskCategory);
      if (catA !== catB) return catA - catB;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
    allEmployeeTasks.push({
      user_id: uid,
      user_name: data.full_name,
      user_role: data.role,
      tasks: data.tasks,
      completed_count: data.tasks.filter((t) => t.is_completed).length,
      total_count: data.tasks.length,
    });
  }

  allEmployeeTasks.sort((a, b) => a.user_name.localeCompare(b.user_name, "es"));

  // Fetch active users (for management tab)
  const { data: users } = await supabase
    .from("user_profiles")
    .select("id, full_name, role")
    .eq("is_active", true)
    .neq("role", "admin")
    .order("full_name");

  return {
    myTasks: myActiveTasks,
    allEmployeeTasks,
    users: users ?? [],
  };
};

export const useActivities = () => {
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<ActivitiesData>(
    authLoading ? null : ["activities", isAdmin, user?.id],
    () => fetchActivities(isAdmin, user?.id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  return {
    myTasks: data?.myTasks ?? [],
    allEmployeeTasks: data?.allEmployeeTasks ?? [],
    users: data?.users ?? [],
    error,
    isLoading: authLoading || isLoading,
    mutate,
  };
};
