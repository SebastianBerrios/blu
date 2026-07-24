"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { computeExtraHoursBalances } from "@/features/horario/services/extraHoursService";
import type { ExtraHoursLogWithUser } from "@/types";

const fetchExtraHours = async (
  isAdmin: boolean,
  userId: string | undefined
): Promise<ExtraHoursLogWithUser[]> => {
  const supabase = createClient();

  let query = supabase
    .from("extra_hours_log")
    .select(
      `
      *,
      user:user_profiles!extra_hours_log_user_id_fkey (full_name),
      creator:user_profiles!extra_hours_log_created_by_fkey (full_name)
    `
    )
    .order("created_at", { ascending: false });

  if (!isAdmin && userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching extra hours:", error);
    throw new Error(error.message);
  }

  return (data || []).map((entry) => {
    const user = entry.user as unknown as { full_name: string | null } | null;
    const creator = entry.creator as unknown as { full_name: string | null } | null;
    return {
      ...entry,
      user_name: user?.full_name ?? null,
      creator_name: creator?.full_name ?? null,
    };
  });
};

export const useExtraHours = () => {
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<ExtraHoursLogWithUser[]>(
    authLoading ? null : ["extra-hours", isAdmin, user?.id],
    () => fetchExtraHours(isAdmin, user?.id)
  );

  const entries = useMemo(() => data ?? [], [data]);

  const balances = useMemo(() => computeExtraHoursBalances(entries), [entries]);

  return {
    entries,
    balances,
    error,
    isLoading: authLoading || isLoading,
    mutate,
  };
};
