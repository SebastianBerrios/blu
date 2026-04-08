import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import type { Ingredient } from "@/types";

export async function adjustInventory(
  ingredient: Ingredient,
  newQuantity: number,
  userId: string | null,
  userName: string | null,
): Promise<void> {
  const supabase = createClient();

  const { error: updateError } = await supabase
    .from("ingredients")
    .update({ quantity: newQuantity })
    .eq("id", ingredient.id);
  if (updateError) throw updateError;

  const { error: movError } = await supabase
    .from("inventory_movements")
    .insert({
      ingredient_id: ingredient.id,
      user_id: userId,
      user_name: userName,
      old_quantity: ingredient.quantity,
      new_quantity: newQuantity,
      reason: "manual",
    });
  if (movError) throw movError;

  logAudit({
    userId,
    userName,
    action: "ajustar_inventario",
    targetTable: "inventory_movements",
    targetId: ingredient.id,
    targetDescription: `${ingredient.name}: ${ingredient.quantity} → ${newQuantity} ${ingredient.unit_of_measure}`,
  });
}
