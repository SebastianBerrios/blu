import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { convert } from "@/utils/helpers/units";
import type {
  Producible,
  ProductionConsumptionLine,
  ProductionWithNames,
} from "@/types";

/** Conversión kg/g, l/ml y und↔peso (espejo del helper SQL _convert_qty). Si las
 *  unidades son incompatibles, devuelve la cantidad sin convertir (la BD hace lo mismo). */
export function convertQty(
  qty: number,
  from: string,
  to: string,
  gramsPerUnit?: number | null,
): number {
  return convert(qty, from, to, gramsPerUnit) ?? qty;
}

interface ProducibleRow {
  id: number;
  name: string;
  unit_of_measure: string;
  stock_quantity: number;
  recipe_id: number;
  recipes: {
    id: number;
    name: string;
    quantity: number;
    unit_of_measure: string;
  } | null;
}

export async function fetchProducibles(): Promise<Producible[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select(
      `id, name, unit_of_measure, stock_quantity, recipe_id,
       recipes!ingredients_recipe_id_fkey ( id, name, quantity, unit_of_measure )`,
    )
    .not("recipe_id", "is", null)
    .order("name", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as unknown as ProducibleRow[];
  return rows
    .filter((r) => r.recipes != null)
    .map((r) => ({
      ingredient_id: r.id,
      ingredient_name: r.name,
      ingredient_unit: r.unit_of_measure,
      stock_quantity: r.stock_quantity,
      recipe_id: r.recipes!.id,
      recipe_name: r.recipes!.name,
      yield: r.recipes!.quantity,
      yield_unit: r.recipes!.unit_of_measure,
    }));
}

interface ConsumptionRow {
  quantity: number;
  unit_of_measure: string;
  ingredients: {
    id: number;
    name: string;
    unit_of_measure: string;
    stock_quantity: number;
    unit_weight_g: number | null;
  };
}

export async function fetchConsumption(
  recipeId: number,
): Promise<ProductionConsumptionLine[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recipe_ingredients")
    .select(
      `quantity, unit_of_measure,
       ingredients ( id, name, unit_of_measure, stock_quantity, unit_weight_g )`,
    )
    .eq("recipe_id", recipeId);
  if (error) throw error;

  const rows = (data ?? []) as unknown as ConsumptionRow[];
  return rows.map((r) => ({
    ingredient_id: r.ingredients.id,
    ingredient_name: r.ingredients.name,
    ingredient_unit: r.ingredients.unit_of_measure,
    stock_quantity: r.ingredients.stock_quantity,
    per_batch: convertQty(
      r.quantity,
      r.unit_of_measure,
      r.ingredients.unit_of_measure,
      r.ingredients.unit_weight_g,
    ),
  }));
}

export async function produceRecipeBatch(
  producible: Producible,
  batches: number,
  userId: string | null,
  userName: string | null,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("produce_recipe_batch", {
    p_ingredient_id: producible.ingredient_id,
    p_batches: batches,
    p_user_id: userId ?? undefined,
    p_user_name: userName ?? undefined,
  });
  if (error) throw error;

  const added = producible.yield * batches;
  logAudit({
    userId,
    userName,
    action: "producir_lote",
    targetTable: "productions",
    targetId: producible.ingredient_id,
    targetDescription: `Producción ${producible.ingredient_name}: ${batches} lote(s) → +${added} ${producible.yield_unit}`,
  });
}

export async function reverseProduction(
  productionId: number,
  description: string,
  userId: string | null,
  userName: string | null,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("reverse_production", {
    p_production_id: productionId,
    p_user_id: userId ?? undefined,
    p_user_name: userName ?? undefined,
  });
  if (error) throw error;

  logAudit({
    userId,
    userName,
    action: "revertir_produccion",
    targetTable: "productions",
    targetId: productionId,
    targetDescription: description,
  });
}

interface RecentProductionRow {
  id: number;
  batches: number;
  yield_added: number;
  created_at: string;
  reversed_at: string | null;
  reversed_by: string | null;
  ingredient_id: number;
  recipe_id: number;
  user_id: string | null;
  user_name: string | null;
  ingredients: { name: string; unit_of_measure: string } | null;
}

export async function fetchRecentProductions(
  limit = 20,
): Promise<ProductionWithNames[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("productions")
    .select(
      `id, batches, yield_added, created_at, reversed_at, reversed_by,
       ingredient_id, recipe_id, user_id, user_name,
       ingredients ( name, unit_of_measure )`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data ?? []) as unknown as RecentProductionRow[];
  return rows.map((r) => ({
    id: r.id,
    batches: r.batches,
    yield_added: r.yield_added,
    created_at: r.created_at,
    reversed_at: r.reversed_at,
    reversed_by: r.reversed_by,
    ingredient_id: r.ingredient_id,
    recipe_id: r.recipe_id,
    user_id: r.user_id,
    user_name: r.user_name,
    ingredient_name: r.ingredients?.name ?? `Ingrediente #${r.ingredient_id}`,
    ingredient_unit: r.ingredients?.unit_of_measure ?? "",
  }));
}
