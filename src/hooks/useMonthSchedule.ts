"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetchTemplates, fetchOverrides, fetchActiveUsers, computeWorkingSlots } from "./useSchedule";
import { getMonthGridDates, getDayOfWeekFromDate } from "@/features/horario/utils/calendarDates";
import type {
  ScheduleTemplate,
  ScheduleOverride,
  ScheduleSlot,
  ScheduleUser,
  DayOfWeek,
} from "@/types";

export interface MonthParams {
  year: number;
  month: number; // 0-based (JS Date month)
}

interface MonthScheduleData {
  templates: ScheduleTemplate[];
  overrides: ScheduleOverride[];
  users: ScheduleUser[];
}

const fetchMonthData = async (
  gridStart: string,
  gridEnd: string
): Promise<MonthScheduleData> => {
  const [templates, overrides, users] = await Promise.all([
    fetchTemplates(),
    fetchOverrides(gridStart, gridEnd),
    fetchActiveUsers(),
  ]);
  return { templates, overrides, users };
};

export const useMonthSchedule = (params: MonthParams | null) => {
  const year = params?.year ?? null;
  const month = params?.month ?? null;

  const gridDates = useMemo(
    () => (year !== null && month !== null ? getMonthGridDates(year, month) : []),
    [year, month]
  );

  const gridStart = gridDates[0] ?? "";
  const gridEnd = gridDates[gridDates.length - 1] ?? "";

  const { data, error, isLoading, mutate } = useSWR<MonthScheduleData>(
    params ? ["schedule-month", params.year, params.month] : null,
    () => fetchMonthData(gridStart, gridEnd),
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
    if (!users.length || !gridDates.length) return [];

    const userMap = new Map(
      users.map((u) => [u.id, { name: u.full_name ?? "Sin nombre", role: u.role ?? "" }])
    );

    const result: ScheduleSlot[] = [];

    for (const date of gridDates) {
      const dayOfWeek = getDayOfWeekFromDate(date) as DayOfWeek;

      for (const user of users) {
        const userInfo = userMap.get(user.id)!;

        const dayOverrides = overrides.filter(
          (o) => o.user_id === user.id && o.override_date === date
        );

        const extraOverrides = dayOverrides.filter((o) => o.is_extra_shift);
        const regularOverrides = dayOverrides.filter((o) => !o.is_extra_shift);

        // Extra shift overrides
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
              override_id: ov.id,
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
            // Partial time-off: emit separate work + permission blocks
            if (ov.time_off_request_id && !ov.is_day_off && ov.start_time && ov.end_time) {
              const dayTemplates = templates.filter(
                (t) => t.user_id === user.id && t.day_of_week === dayOfWeek
              );
              const offStart = ov.start_time;
              const offEnd = ov.end_time;
              for (const tmpl of dayTemplates) {
                const workSlots = computeWorkingSlots(tmpl.start_time, tmpl.end_time, offStart, offEnd);
                if (workSlots.length === 0) {
                  // Time-off covers entire shift → day off
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
                } else {
                  // Work blocks (normal appearance)
                  for (const ws of workSlots) {
                    result.push({
                      user_id: user.id,
                      user_name: userInfo.name,
                      user_role: userInfo.role,
                      day_of_week: dayOfWeek,
                      date,
                      start_time: ws.start_time,
                      end_time: ws.end_time,
                      is_override: false,
                      is_day_off: false,
                    });
                  }
                  // Permission block (separate, day-off styling)
                  result.push({
                    user_id: user.id,
                    user_name: userInfo.name,
                    user_role: userInfo.role,
                    day_of_week: dayOfWeek,
                    date,
                    start_time: offStart.slice(0, 5),
                    end_time: offEnd.slice(0, 5),
                    is_override: true,
                    is_day_off: true,
                    override_reason: ov.reason ?? undefined,
                  });
                }
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
          continue;
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
  }, [templates, overrides, users, gridDates]);

  return {
    slots,
    templates,
    overrides,
    users,
    gridDates,
    error,
    isLoading,
    mutate,
  };
};
