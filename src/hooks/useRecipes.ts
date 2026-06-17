import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { Recipe, RecipeWithProducible } from "@/types";

interface RecipeRow extends Recipe {
  ingredients: { id: number }[] | null;
}

const fetchRecipes = async (): Promise<RecipeWithProducible[]> => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select("*, ingredients!ingredients_recipe_id_fkey ( id )");

  if (error) {
    console.error("Error fetching recipes:", error);
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as RecipeRow[]).map(({ ingredients, ...recipe }) => ({
    ...recipe,
    is_producible: (ingredients?.length ?? 0) > 0,
  }));
};

export const useRecipes = () => {
  const { data, error, isLoading, mutate } = useSWR<RecipeWithProducible[]>(
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
