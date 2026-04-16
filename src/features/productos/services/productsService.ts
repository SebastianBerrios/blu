import { createClient } from "@/utils/supabase/client";
import type { CreateProduct } from "@/types";

interface ProductWrite {
  name: string;
  category_id: number;
  manufacturing_cost: number;
  price: number;
  suggested_price: number;
  temperatura: string | null;
  tipo_leche: string | null;
  recipe_id: number | null;
}

export function buildProductPayload(
  data: CreateProduct,
  suggestedPrice: number,
  recipeId: number | null
): ProductWrite {
  return {
    name: data.name.toLowerCase(),
    category_id: data.categoryId,
    manufacturing_cost: Number(data.manufacturing_cost ?? 0),
    price: Number(data.price),
    suggested_price: Number(suggestedPrice),
    temperatura: data.temperatura || null,
    tipo_leche: data.tipo_leche || null,
    recipe_id: recipeId,
  };
}

export async function createProduct(payload: ProductWrite): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").insert(payload);
  if (error) throw error;
}

export async function updateProduct(id: number, payload: ProductWrite): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").update(payload).eq("id", id);
  if (error) throw error;
}
