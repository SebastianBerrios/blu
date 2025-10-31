import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { Recipe } from "@/types";

const fetchRecipes = async () => {
  const supabase = createClient();

  const { data, error } = await supabase.from("recipes").select();

  if (error) {
    console.error("Error fetching recipes:", error);
    throw new Error(error.message);
  }

  return data || [];
};

export const useRecipes = () => {
  const { data, error, isLoading, mutate } = useSWR<Recipe[]>(
    "recipes",
    fetchRecipes,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  return { recipes: data ?? [], error, isLoading, mutate };
};
