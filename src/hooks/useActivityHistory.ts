"use client";

import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { EmployeeTask, TaskCompletion, DayCompletionSummary, TaskCategory } from "@/types";
import { CATEGORY_ORDER } from "@/features/actividades/constants";

interface HistoryFilters {
  startDate: string;
  endDate: string;
  userId?: string;
}

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 ? 6 : day - 1;
}

function isTaskApplicableForDate(task: EmployeeTask, dateStr: string): boolean {
  const dow = getDayOfWeek(dateStr);
  if (dow > 5) return false;
  if (task.frequency === "daily") return true;
  if (task.frequency === "weekly" && task.days_of_week) {
    return task.days_of_week.includes(dow);
  }
  return false;
}

interface HistoryData {
  summaries: DayCompletionSummary[];
  tasks: EmployeeTask[];
  completions: TaskCompletion[];
}

const fetchHistory = async (filters: HistoryFilters): Promise<HistoryData> => {
  const supabase = createClient();

  // Fetch all active tasks with user info
  let tasksQuery = supabase
    .from("employee_tasks")
    .select("*, user:user_profiles!employee_tasks_user_id_fkey (full_name, role)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (filters.userId) {
    tasksQuery = tasksQuery.eq("user_id", filters.userId);
  }

  const { data: tasks, error: tasksError } = await tasksQuery;
  if (tasksError) throw new Error(tasksError.message);

  // Fetch completions in date range
  let compQuery = supabase
    .from("task_completions")
    .select("*")
    .gte("completion_date", filters.startDate)
    .lte("completion_date", filters.endDate);

  if (filters.userId) {
    compQuery = compQuery.eq("user_id", filters.userId);
  }

  const { data: completions, error: compError } = await compQuery;
  if (compError) throw new Error(compError.message);

  // Build daily summaries
  const summaries: DayCompletionSummary[] = [];
  const dates: string[] = [];
  const start = new Date(filters.startDate + "T00:00:00");
  const end = new Date(filters.endDate + "T00:00:00");

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0) continue; // Skip Sundays
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }

  // Group tasks by user
  const userTasks = new Map<string, { tasks: EmployeeTask[]; name: string }>();
  for (const t of tasks ?? []) {
    const u = t.user as unknown as { full_name: string | null; role: string | null } | null;
    if (!userTasks.has(t.user_id)) {
      userTasks.set(t.user_id, { tasks: [], name: u?.full_name ?? "Sin nombre" });
    }
    userTasks.get(t.user_id)!.tasks.push(t);
  }

  // Build completion lookup: "taskId:date" → true
  const compSet = new Set<string>();
  for (const c of completions ?? []) {
    compSet.add(`${c.task_id}:${c.completion_date}`);
  }

  for (const dateStr of dates) {
    for (const [uid, userData] of userTasks) {
      const applicable = userData.tasks.filter((t) => isTaskApplicableForDate(t, dateStr));
      if (applicable.length === 0) continue;
      const completed = applicable.filter((t) => compSet.has(`${t.id}:${dateStr}`)).length;

      summaries.push({
        date: dateStr,
        user_id: uid,
        user_name: userData.name,
        total_tasks: applicable.length,
        completed_tasks: completed,
      });
    }
  }

  // Sort summaries: newest first, then by user name
  summaries.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.user_name.localeCompare(b.user_name, "es");
  });

  // Sort tasks by category then sort_order
  const sortedTasks = (tasks ?? []).sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category as TaskCategory);
    const catB = CATEGORY_ORDER.indexOf(b.category as TaskCategory);
    if (catA !== catB) return catA - catB;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  return { summaries, tasks: sortedTasks, completions: completions ?? [] };
};

export const useActivityHistory = (filters: HistoryFilters | null) => {
  const { isLoading: authLoading } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<HistoryData>(
    authLoading || !filters ? null : ["activity-history", filters],
    () => fetchHistory(filters!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  return {
    summaries: data?.summaries ?? [],
    tasks: data?.tasks ?? [],
    completions: data?.completions ?? [],
    error,
    isLoading: authLoading || isLoading,
    mutate,
  };
};
