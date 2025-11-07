import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { RecipeIngredients } from "@/types";

const fetchRecipeIngredients = async () => {
  const supabase = createClient();

  const { data, error } = await supabase.from("recipe_ingredients").select();

  if (error) {
    console.error("Error fetching products:", error);
    throw new Error(error.message);
  }

  return data || [];
};

export const useRecipeIngredients = () => {
  const { data, error, isLoading, mutate } = useSWR<RecipeIngredients[]>(
    "recipe_ingredients",
    fetchRecipeIngredients,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  return { recipeIngredients: data ?? [], error, isLoading, mutate };
};
