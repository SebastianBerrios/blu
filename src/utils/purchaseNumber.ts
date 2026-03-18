import { createClient } from "@/utils/supabase/client";

export async function getPurchaseNumber(purchaseId: number): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("purchases")
    .select("*", { count: "exact", head: true })
    .lte("id", purchaseId);
  return count ?? purchaseId;
}
