"use client";

import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import { localDayRangeISO } from "@/utils/helpers/dateFormatters";
import type { AuditLog } from "@/types/auditLog";

interface AuditLogFilters {
  userId?: string;
  action?: string;
  targetTable?: string;
  startDate?: string;
  endDate?: string;
}

const buildFetcher = (filters: AuditLogFilters) => async (): Promise<AuditLog[]> => {
  const supabase = createClient();

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }
  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.targetTable) {
    query = query.eq("target_table", filters.targetTable);
  }
  if (filters.startDate) {
    query = query.gte("created_at", localDayRangeISO(filters.startDate).start);
  }
  if (filters.endDate) {
    query = query.lte("created_at", localDayRangeISO(filters.endDate).end);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
};

export function useAuditLogs(filters: AuditLogFilters = {}) {
  const key = `audit-logs-${JSON.stringify(filters)}`;

  const { data, error, isLoading, mutate } = useSWR<AuditLog[]>(
    key,
    buildFetcher(filters),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  return {
    logs: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
