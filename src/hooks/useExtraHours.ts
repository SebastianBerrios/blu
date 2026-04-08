"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ExtraHoursLogWithUser, EmployeeBalance } from "@/types";

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
    () => fetchExtraHours(isAdmin, user?.id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  const entries = useMemo(() => data ?? [], [data]);

  const balances = useMemo((): EmployeeBalance[] => {
    const map = new Map<
      string,
      { name: string; role: string; credits: number; debits: number }
    >();

    for (const entry of entries) {
      const existing = map.get(entry.user_id) ?? {
        name: entry.user_name ?? "Sin nombre",
        role: "",
        credits: 0,
        debits: 0,
      };

      if (entry.hours > 0) {
        existing.credits += entry.hours;
      } else {
        existing.debits += Math.abs(entry.hours);
      }

      map.set(entry.user_id, existing);
    }

    return Array.from(map.entries()).map(([userId, info]) => ({
      user_id: userId,
      user_name: info.name,
      user_role: info.role,
      total_credits: info.credits,
      total_debits: info.debits,
      balance: info.credits - info.debits,
    }));
  }, [entries]);

  return {
    entries,
    balances,
    error,
    isLoading: authLoading || isLoading,
    mutate,
  };
};
