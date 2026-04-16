import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { Ingredient, IngredientGroup, InventoryMovement } from "@/types";

const fetchMovements = async (): Promise<InventoryMovement[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inventory_movements")
    .select()
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching inventory movements:", error);
    throw new Error(error.message);
  }

  return data || [];
};

const fetchIngredients = async (): Promise<Ingredient[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select()
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching ingredients:", error);
    throw new Error(error.message);
  }

  return data || [];
};

const fetchGroups = async (): Promise<IngredientGroup[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ingredient_groups")
    .select()
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching ingredient groups:", error);
    throw new Error(error.message);
  }

  return data || [];
};

const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
};

export const useInventory = () => {
  const {
    data: ingredients,
    error: ingredientsError,
    isLoading: ingredientsLoading,
    mutate: mutateIngredients,
  } = useSWR<Ingredient[]>("ingredients", fetchIngredients, swrConfig);

  const {
    data: movements,
    error: movementsError,
    isLoading: movementsLoading,
    mutate: mutateMovements,
  } = useSWR<InventoryMovement[]>("inventory-movements", fetchMovements, swrConfig);

  const {
    data: groups,
    error: groupsError,
    isLoading: groupsLoading,
    mutate: mutateGroups,
  } = useSWR<IngredientGroup[]>("ingredient-groups", fetchGroups, swrConfig);

  return {
    ingredients: ingredients ?? [],
    movements: movements ?? [],
    groups: groups ?? [],
    isLoading: ingredientsLoading || movementsLoading || groupsLoading,
    error: ingredientsError || movementsError || groupsError,
    mutateIngredients,
    mutateMovements,
    mutateGroups,
  };
};
