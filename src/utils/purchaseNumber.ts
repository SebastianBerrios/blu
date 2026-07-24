import { createClient } from "@/utils/supabase/client";

export async function getPurchaseNumber(purchaseId: number): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purchases")
    .select("purchase_number")
    .eq("id", purchaseId)
    .single();
  if (error || !data) return purchaseId;
  const purchaseNumber = (data as { purchase_number: number | null }).purchase_number;
  return purchaseNumber ?? purchaseId;
}
