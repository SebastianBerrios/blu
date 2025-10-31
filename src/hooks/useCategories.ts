import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { Category } from "@/types";

const fetchCategories = async () => {
  const supabase = createClient();

  const { data, error } = await supabase.from("categories").select();

  if (error) {
    console.error("Error fetching categories:", error);
    throw new Error(error.message);
  }

  return data || [];
};

export const useCategories = () => {
  const { data, error, isLoading, mutate } = useSWR<Category[]>(
    "categories",
    fetchCategories,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  return { categories: data ?? [], error, isLoading, mutate };
};
