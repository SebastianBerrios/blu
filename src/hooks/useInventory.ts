import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { Ingredient, InventoryMovement } from "@/types";

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

export const useInventory = () => {
  const {
    data: ingredients,
    error: ingredientsError,
    isLoading: ingredientsLoading,
    mutate: mutateIngredients,
  } = useSWR<Ingredient[]>("ingredients", fetchIngredients, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  });

  const {
    data: movements,
    error: movementsError,
    isLoading: movementsLoading,
    mutate: mutateMovements,
  } = useSWR<InventoryMovement[]>("inventory-movements", fetchMovements, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  });

  return {
    ingredients: ingredients ?? [],
    movements: movements ?? [],
    isLoading: ingredientsLoading || movementsLoading,
    error: ingredientsError || movementsError,
    mutateIngredients,
    mutateMovements,
  };
};
