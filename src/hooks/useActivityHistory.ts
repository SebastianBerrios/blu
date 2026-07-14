"use client";

import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Activity, TaskCompletion, DayCompletionSummary } from "@/types";
import { isActivityScheduledForDate } from "@/features/actividades/frequency";

interface HistoryFilters {
  startDate: string;
  endDate: string;
  userId?: string;
}

interface AssignmentRow {
  activity_id: number;
  user_id: string;
  user: { full_name: string | null; is_active: boolean | null } | null;
}

interface HistoryData {
  summaries: DayCompletionSummary[];
  activities: Activity[];
  completions: TaskCompletion[];
}

const fetchHistory = async (filters: HistoryFilters): Promise<HistoryData> => {
  const supabase = createClient();

  const { data: activities, error: aErr } = await supabase
    .from("activities")
    .select("*")
    .eq("is_active", true);
  if (aErr) throw new Error(aErr.message);

  let assignQuery = supabase
    .from("activity_assignments")
    .select(
      "activity_id, user_id, user:user_profiles!activity_assignments_user_id_fkey (full_name, is_active)"
    );
  if (filters.userId) {
    assignQuery = assignQuery.eq("user_id", filters.userId);
  }
  const { data: rawAssignments, error: asErr } = await assignQuery;
  if (asErr) throw new Error(asErr.message);

  let compQuery = supabase
    .from("task_completions")
    .select("*")
    .gte("completion_date", filters.startDate)
    .lte("completion_date", filters.endDate);
  if (filters.userId) {
    compQuery = compQuery.eq("user_id", filters.userId);
  }
  const { data: completions, error: cErr } = await compQuery;
  if (cErr) throw new Error(cErr.message);

  const activityMap = new Map<number, Activity>();
  for (const a of activities ?? []) activityMap.set(a.id, a);

  const assignments = ((rawAssignments ?? []) as unknown as AssignmentRow[]).filter(
    (as) => as.user?.is_active !== false && activityMap.has(as.activity_id)
  );

  // Group each user's assigned activities.
  const userActivities = new Map<string, { name: string; activityIds: number[] }>();
  for (const as of assignments) {
    if (!userActivities.has(as.user_id)) {
      userActivities.set(as.user_id, {
        name: as.user?.full_name ?? "Sin nombre",
        activityIds: [],
      });
    }
    userActivities.get(as.user_id)!.activityIds.push(as.activity_id);
  }

  // Completion lookup: "activityId:userId:date"
  const compSet = new Set<string>();
  for (const c of completions ?? []) {
    compSet.add(`${c.activity_id}:${c.user_id}:${c.completion_date}`);
  }

  // Enumerate working days (skip Sundays) in the range.
  const dates: string[] = [];
  const start = new Date(filters.startDate + "T00:00:00");
  const end = new Date(filters.endDate + "T00:00:00");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) continue; // Sunday
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }

  const summaries: DayCompletionSummary[] = [];
  for (const dateStr of dates) {
    for (const [uid, data] of userActivities) {
      // Scheduled activities applicable that day (on_demand excluded by the helper).
      const applicable = data.activityIds
        .map((id) => activityMap.get(id))
        .filter((a): a is Activity => !!a && isActivityScheduledForDate(a, dateStr));
      if (applicable.length === 0) continue;

      const completed = applicable.filter((a) =>
        compSet.has(`${a.id}:${uid}:${dateStr}`)
      ).length;

      summaries.push({
        date: dateStr,
        user_id: uid,
        user_name: data.name,
        total_tasks: applicable.length,
        completed_tasks: completed,
      });
    }
  }

  summaries.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.user_name.localeCompare(b.user_name, "es");
  });

  return { summaries, activities: activities ?? [], completions: completions ?? [] };
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
    activities: data?.activities ?? [],
    completions: data?.completions ?? [],
    error,
    isLoading: authLoading || isLoading,
    mutate,
  };
};
