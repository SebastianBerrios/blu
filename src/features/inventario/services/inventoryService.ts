import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import type { Ingredient, IngredientGroup } from "@/types";

export async function adjustInventory(
  ingredient: Ingredient,
  newQuantity: number,
  userId: string | null,
  userName: string | null,
): Promise<void> {
  const supabase = createClient();

  // Ajuste atómico vía RPC: actualiza stock e inserta el movimiento en una sola
  // transacción. El INSERT directo a inventory_movements está bloqueado por RLS.
  const { error } = await supabase.rpc("adjust_inventory_manual", {
    p_ingredient_id: ingredient.id,
    p_new_quantity: newQuantity,
    p_user_id: userId ?? undefined,
    p_user_name: userName ?? undefined,
  });
  if (error) throw error;

  logAudit({
    userId,
    userName,
    action: "ajustar_inventario",
    targetTable: "inventory_movements",
    targetId: ingredient.id,
    targetDescription: `${ingredient.name}: ${ingredient.stock_quantity} → ${newQuantity} ${ingredient.unit_of_measure}`,
  });
}

export async function toggleNeedsPurchase(
  ingredientId: number,
  value: boolean,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ingredients")
    .update({ needs_purchase: value })
    .eq("id", ingredientId);
  if (error) throw error;
}

export async function fetchGroups(): Promise<IngredientGroup[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ingredient_groups")
    .select()
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createGroup(name: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ingredient_groups")
    .insert({ name });
  if (error) throw error;
}

export async function updateGroup(id: number, name: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ingredient_groups")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGroup(
  id: number,
  userId: string | null,
  userName: string | null,
  groupName: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ingredient_groups")
    .delete()
    .eq("id", id);
  if (error) throw error;

  logAudit({
    userId,
    userName,
    action: "eliminar",
    targetTable: "ingredient_groups",
    targetId: id,
    targetDescription: groupName,
  });
}

export async function assignIngredientGroup(
  ingredientId: number,
  groupId: number | null,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ingredients")
    .update({ group_id: groupId })
    .eq("id", ingredientId);
  if (error) throw error;
}
