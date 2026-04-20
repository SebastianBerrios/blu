"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetchTemplates, fetchOverrides, fetchActiveUsers } from "./useSchedule";
import { mergeTemplatesAndOverrides } from "@/features/horario/services/scheduleMerge";
import { getMonthGridDates, getDayOfWeekFromDate } from "@/features/horario/utils/calendarDates";
import type {
  ScheduleTemplate,
  ScheduleOverride,
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

  const slots = useMemo(
    () =>
      mergeTemplatesAndOverrides(
        templates,
        overrides,
        users,
        gridDates,
        (date) => getDayOfWeekFromDate(date) as DayOfWeek
      ),
    [templates, overrides, users, gridDates]
  );

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
