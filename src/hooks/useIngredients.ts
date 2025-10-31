import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { Ingredient } from "@/types";

const fetchIngredients = async () => {
  const supabase = createClient();

  const { data, error } = await supabase.from("ingredients").select();

  if (error) {
    console.error("Error fetching ingredients:", error);
    throw new Error(error.message);
  }

  return data || [];
};

export const useIngredients = () => {
  const { data, error, isLoading, mutate } = useSWR<Ingredient[]>(
    "ingredients",
    fetchIngredients,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  return { ingredients: data ?? [], error, isLoading, mutate };
};
