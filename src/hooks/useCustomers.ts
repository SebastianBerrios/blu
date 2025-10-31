import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { Customer } from "@/types";

const fetchCustomers = async () => {
  const supabase = createClient();

  const { data, error } = await supabase.from("customers").select();

  if (error) {
    console.error("Error fetching customers:", error);
    throw new Error(error.message);
  }

  return data || [];
};

export const useCustomers = () => {
  const { data, error, isLoading, mutate } = useSWR<Customer[]>(
    "customers",
    fetchCustomers,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  return { customers: data ?? [], error, isLoading, mutate };
};
