"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type {
  ScheduleTemplate,
  ScheduleOverride,
  ScheduleSlot,
  ScheduleUser,
  DayOfWeek,
} from "@/types";
import { toLocalDateStr } from "@/features/horario/utils/calendarDates";

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

  const slots = useMemo(() => {
    if (!users.length) return [];

    const userMap = new Map(
      users.map((u) => [u.id, { name: u.full_name ?? "Sin nombre", role: u.role ?? "" }])
    );

    const result: ScheduleSlot[] = [];

    for (let dayIdx = 0; dayIdx < weekDates.length; dayIdx++) {
      const date = weekDates[dayIdx];
      const dayOfWeek = dayIdx as DayOfWeek;

      for (const user of users) {
        const userInfo = userMap.get(user.id)!;

        // Check overrides for this user + date
        const dayOverrides = overrides.filter(
          (o) => o.user_id === user.id && o.override_date === date
        );

        const extraOverrides = dayOverrides.filter((o) => o.is_extra_shift);
        const regularOverrides = dayOverrides.filter((o) => !o.is_extra_shift);

        // Extra shift overrides always get added as slots
        for (const ov of extraOverrides) {
          if (ov.start_time && ov.end_time) {
            result.push({
              user_id: user.id,
              user_name: userInfo.name,
              user_role: userInfo.role,
              day_of_week: dayOfWeek,
              date,
              start_time: ov.start_time,
              end_time: ov.end_time,
              is_override: true,
              is_extra_shift: true,
              is_day_off: false,
              override_reason: ov.reason ?? undefined,
            });
          }
        }

        // Regular overrides replace templates
        if (regularOverrides.length > 0) {
          for (const ov of regularOverrides) {
            if (ov.is_day_off && !ov.is_absence) {
              // Show template times with day-off flag (approved time-off)
              const dayTemplates = templates.filter(
                (t) => t.user_id === user.id && t.day_of_week === dayOfWeek
              );
              for (const tmpl of dayTemplates) {
                result.push({
                  user_id: user.id,
                  user_name: userInfo.name,
                  user_role: userInfo.role,
                  day_of_week: dayOfWeek,
                  date,
                  start_time: tmpl.start_time,
                  end_time: tmpl.end_time,
                  is_override: true,
                  is_day_off: true,
                  override_reason: ov.reason ?? undefined,
                });
              }
              continue;
            }
            if (ov.start_time && ov.end_time) {
              result.push({
                user_id: user.id,
                user_name: userInfo.name,
                user_role: userInfo.role,
                day_of_week: dayOfWeek,
                date,
                start_time: ov.start_time,
                end_time: ov.end_time,
                is_override: true,
                is_day_off: false,
                is_absence: ov.is_absence ?? false,
                override_reason: ov.reason ?? undefined,
              });
            }
          }
          continue; // Regular override replaces template for this day
        }

        // Fall back to template
        const dayTemplates = templates.filter(
          (t) => t.user_id === user.id && t.day_of_week === dayOfWeek
        );

        for (const tmpl of dayTemplates) {
          result.push({
            user_id: user.id,
            user_name: userInfo.name,
            user_role: userInfo.role,
            day_of_week: dayOfWeek,
            date,
            start_time: tmpl.start_time,
            end_time: tmpl.end_time,
            is_override: false,
            is_day_off: false,
          });
        }
      }
    }

    return result;
  }, [templates, overrides, users, weekDates]);

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
