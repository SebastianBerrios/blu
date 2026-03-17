import { createClient } from "@/utils/supabase/client";

export async function getSaleNumber(saleId: number): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("sales")
    .select("*", { count: "exact", head: true })
    .lte("id", saleId);
  return count ?? saleId;
}
