import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { Sale } from "@/types";

const fetchSales = async () => {
  const supabase = createClient();

  const { data, error } = await supabase.from("sales").select();

  if (error) {
    console.error("Error fetching sales:", error);
    throw new Error(error.message);
  }

  return data || [];
};

export const useSales = () => {
  const { data, error, isLoading, mutate } = useSWR<Sale[]>(
    "sales",
    fetchSales,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  return { sales: data ?? [], error, isLoading, mutate };
};
