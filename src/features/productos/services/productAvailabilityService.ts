import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import type { Product } from "@/types";

export async function toggleProductAvailability(
  product: Product,
  newValue: boolean,
  userId: string | null,
  userName: string | null,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("products")
    .update({ is_available: newValue })
    .eq("id", product.id);
  if (error) throw error;

  logAudit({
    userId,
    userName,
    action: "cambiar_disponibilidad",
    targetTable: "products",
    targetId: product.id,
    targetDescription: `${product.name}: ${newValue ? "Disponible" : "No disponible"}`,
  });
}
