"use client";

import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { TimeOffRequestWithUser, TimeOffStatus } from "@/types";

interface TimeOffFilters {
  status?: TimeOffStatus;
}

const fetchTimeOffRequests = async (
  isAdmin: boolean,
  userId: string | undefined,
  filters: TimeOffFilters
): Promise<TimeOffRequestWithUser[]> => {
  const supabase = createClient();

  let query = supabase
    .from("time_off_requests")
    .select(
      `
      *,
      user:user_profiles!time_off_requests_user_id_fkey (full_name, role),
      reviewer:user_profiles!time_off_requests_reviewed_by_fkey (full_name)
    `
    )
    .order("created_at", { ascending: false });

  if (!isAdmin && userId) {
    query = query.eq("user_id", userId);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching time off requests:", error);
    throw new Error(error.message);
  }

  return (data || []).map((r) => {
    const user = r.user as unknown as { full_name: string | null; role: string | null } | null;
    const reviewer = r.reviewer as unknown as { full_name: string | null } | null;
    return {
      ...r,
      user_name: user?.full_name ?? null,
      user_role: user?.role ?? null,
      reviewer_name: reviewer?.full_name ?? null,
    };
  });
};

export const useTimeOffRequests = (filters: TimeOffFilters = {}) => {
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<TimeOffRequestWithUser[]>(
    authLoading ? null : ["time-off-requests", isAdmin, user?.id, filters],
    () => fetchTimeOffRequests(isAdmin, user?.id, filters),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  return {
    requests: data ?? [],
    error,
    isLoading: authLoading || isLoading,
    mutate,
  };
};
