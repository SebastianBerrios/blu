import { createClient } from "@/utils/supabase/client";

export async function getSaleNumber(saleId: number): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("sale_number")
    .eq("id", saleId)
    .single();
  if (error || !data) return saleId;
  const saleNumber = (data as { sale_number: number | null }).sale_number;
  return saleNumber ?? saleId;
}
