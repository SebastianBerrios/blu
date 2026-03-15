import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { UserProfile } from "@/types/auth";

const fetchUsers = async (): Promise<UserProfile[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR("users", fetchUsers, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  });

  return {
    users: data || [],
    error,
    isLoading,
    mutate,
  };
}
