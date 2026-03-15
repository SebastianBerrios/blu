"use client";

import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { AppRole, UserProfile } from "@/types/auth";

const supabase = createClient();

const fetchAuth = async (): Promise<{
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
}> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    user: { id: user.id, email: user.email ?? "" },
    profile,
  };
};

export function useAuth() {
  const { data, error, isLoading, mutate } = useSWR("auth", fetchAuth, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  });

  const user = data?.user ?? null;
  const profile = data?.profile ?? null;
  const role = profile?.role ?? null;
  const isAdmin = role === "admin";
  const isPending = user !== null && role === null;
  const isInactive = profile?.is_active === false;

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const hasRole = (...roles: AppRole[]) => role !== null && roles.includes(role);

  return {
    user,
    profile,
    role,
    isAdmin,
    isPending,
    isInactive,
    isLoading,
    error,
    signOut,
    hasRole,
    mutate,
  };
}
