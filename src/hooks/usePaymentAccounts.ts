import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";

export interface PaymentAccount {
  id: number;
  type: string;
  name: string;
}

const fetchPaymentAccounts = async (): Promise<PaymentAccount[]> => {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_payment_accounts");

  if (error) {
    console.error("Error fetching payment accounts:", error);
    throw new Error(error.message);
  }

  return (data as PaymentAccount[]) ?? [];
};

export const usePaymentAccounts = () => {
  const { data, error, isLoading, mutate } = useSWR<PaymentAccount[]>(
    "payment_accounts",
    fetchPaymentAccounts
  );

  const accounts = data ?? [];
  const cajaAccount = accounts.find((a) => a.type === "caja");
  const bancoAccount = accounts.find((a) => a.type === "banco");
  const rappiAccount = accounts.find((a) => a.type === "rappi");
  const posAccount = accounts.find((a) => a.type === "pos");

  return {
    accounts,
    cajaAccount,
    bancoAccount,
    rappiAccount,
    posAccount,
    error,
    isLoading,
    mutate,
  };
};
