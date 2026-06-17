import { createClient } from "@/utils/supabase/client";
import type { ProductComponentLine } from "@/types";

interface ComponentRow {
  component_product_id: number;
  quantity: number;
  products: { name: string; manufacturing_cost: number | null } | null;
}

/** Carga los componentes de un combo, con nombre y costo de cada producto. */
export async function loadProductComponents(
  productId: number
): Promise<ProductComponentLine[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("product_components")
    .select(
      "component_product_id, quantity, products!product_components_component_product_id_fkey(name, manufacturing_cost)"
    )
    .eq("bundle_product_id", productId);
  if (error) throw error;

  return ((data ?? []) as unknown as ComponentRow[]).map((row) => ({
    component_product_id: row.component_product_id,
    component_name: row.products?.name ?? "",
    quantity: Number(row.quantity),
    unit_cost: Number(row.products?.manufacturing_cost ?? 0),
  }));
}

/** Reemplaza la composición de un combo (delete + insert). Lista vacía la limpia. */
export async function saveProductComponents(
  bundleId: number,
  lines: ProductComponentLine[]
): Promise<void> {
  const supabase = createClient();

  const { error: delError } = await supabase
    .from("product_components")
    .delete()
    .eq("bundle_product_id", bundleId);
  if (delError) throw delError;

  if (lines.length === 0) return;

  const rows = lines.map((l) => ({
    bundle_product_id: bundleId,
    component_product_id: l.component_product_id,
    quantity: l.quantity,
  }));
  const { error } = await supabase.from("product_components").insert(rows);
  if (error) throw error;
}
