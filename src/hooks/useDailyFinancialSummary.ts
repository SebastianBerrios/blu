import useSWR from "swr";
import {
  fetchDailySummary,
  type DailySummary,
} from "@/features/finanzas";

export function useDailyFinancialSummary(date: string | null) {
  const { data, error, isLoading, mutate } = useSWR<DailySummary>(
    date ? ["daily-summary", date] : null,
    async ([, d]: [string, string]) => fetchDailySummary(d)
  );

  return { summary: data, error, isLoading, mutate };
}
