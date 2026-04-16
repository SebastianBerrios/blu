import { createClient } from "@/utils/supabase/client";
import { deleteWithAudit } from "@/utils/helpers/deleteWithAudit";
import type { CreateIngredient } from "@/types";

interface IngredientWrite {
  name: string;
  quantity: number;
  unit_of_measure: string;
  price: number;
  group_id: number | null;
}

export function buildIngredientPayload(data: CreateIngredient): IngredientWrite {
  return {
    name: data.name.toLowerCase(),
    quantity: Number(data.quantity),
    unit_of_measure: data.unit_of_measure,
    price: Number(data.price),
    group_id: data.group_id ? Number(data.group_id) : null,
  };
}

export async function createIngredient(payload: IngredientWrite): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("ingredients").insert(payload);
  if (error) throw error;
}

export async function updateIngredient(id: number, payload: IngredientWrite): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("ingredients").update(payload).eq("id", id);
  if (error) throw error;
}

interface DeleteIngredientParams {
  id: number;
  name: string;
  userId: string | null;
  userName: string | null;
}

export async function deleteIngredient(params: DeleteIngredientParams): Promise<void> {
  await deleteWithAudit({
    table: "ingredients",
    id: params.id,
    userId: params.userId,
    userName: params.userName,
    auditTable: "ingredients",
    description: `Ingrediente eliminado: ${params.name}`,
  });
}
