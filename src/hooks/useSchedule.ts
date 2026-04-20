"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type {
  ScheduleTemplate,
  ScheduleOverride,
  ScheduleUser,
  DayOfWeek,
} from "@/types";
import { toLocalDateStr } from "@/features/horario/utils/calendarDates";
import {
  mergeTemplatesAndOverrides,
  computeWorkingSlots as computeWorkingSlotsHelper,
} from "@/features/horario/services/scheduleMerge";

export const fetchTemplates = async (): Promise<ScheduleTemplate[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedule_templates")
    .select("*")
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching schedule templates:", error);
    throw new Error(error.message);
  }
  return data || [];
};

export const fetchOverrides = async (
  weekStart: string,
  weekEnd: string
): Promise<ScheduleOverride[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedule_overrides")
    .select("*")
    .gte("override_date", weekStart)
    .lte("override_date", weekEnd);

  if (error) {
    console.error("Error fetching schedule overrides:", error);
    throw new Error(error.message);
  }
  return data || [];
};

export const fetchActiveUsers = async (): Promise<ScheduleUser[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, full_name, role")
    .eq("is_active", true)
    .neq("role", "admin")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error fetching users:", error);
    throw new Error(error.message);
  }
  return data || [];
};

interface ScheduleData {
  templates: ScheduleTemplate[];
  overrides: ScheduleOverride[];
  users: ScheduleUser[];
}

const fetchScheduleData = async (
  weekStart: string,
  weekEnd: string
): Promise<ScheduleData> => {
  const [templates, overrides, users] = await Promise.all([
    fetchTemplates(),
    fetchOverrides(weekStart, weekEnd),
    fetchActiveUsers(),
  ]);
  return { templates, overrides, users };
};

export function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const start = new Date(weekStart + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(toLocalDateStr(d));
  }
  return dates;
}

// Re-exported for backward compatibility (existing callers import from this module).
export const computeWorkingSlots = computeWorkingSlotsHelper;

export function getMonday(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return toLocalDateStr(d);
}

export const useSchedule = (weekStart: string | null) => {
  const weekDates = useMemo(
    () => (weekStart ? getWeekDates(weekStart) : []),
    [weekStart]
  );
  const weekEnd = weekDates.length ? weekDates[weekDates.length - 1] : "";

  const { data, error, isLoading, mutate } = useSWR<ScheduleData>(
    weekStart ? ["schedule", weekStart] : null,
    () => fetchScheduleData(weekStart!, weekEnd),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  const templates = useMemo(() => data?.templates ?? [], [data?.templates]);
  const overrides = useMemo(() => data?.overrides ?? [], [data?.overrides]);
  const users = useMemo(() => data?.users ?? [], [data?.users]);

  const slots = useMemo(
    () =>
      mergeTemplatesAndOverrides(
        templates,
        overrides,
        users,
        weekDates,
        (_date, idx) => idx as DayOfWeek
      ),
    [templates, overrides, users, weekDates]
  );

  return {
    slots,
    templates,
    overrides,
    users,
    error,
    isLoading,
    mutate,
  };
};
