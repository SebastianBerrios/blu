import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { Account } from "@/types";

const fetchAccounts = async (): Promise<Account[]> => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("id");

  if (error) {
    console.error("Error fetching accounts:", error);
    throw new Error(error.message);
  }

  return data || [];
};

export const useAccounts = () => {
  const { data, error, isLoading, mutate } = useSWR<Account[]>(
    "accounts",
    fetchAccounts,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  const accounts = data ?? [];
  const cajaAccount = accounts.find((a) => a.type === "caja");
  const bancoAccount = accounts.find((a) => a.type === "banco");
  const rappiAccount = accounts.find((a) => a.type === "rappi");

  return { accounts, cajaAccount, bancoAccount, rappiAccount, error, isLoading, mutate };
};
