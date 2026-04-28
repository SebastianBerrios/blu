import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import { toLocalDateKey, groupByDate } from "@/utils/helpers/groupByDate";
import { getSaleNet } from "@/features/ventas/utils/saleAmounts";
import type { SaleWithProducts, SalesGroupedByDate } from "@/types";

export { toLocalDateKey };

function getTodayStart(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

const fetchSales = async (todayOnly = false): Promise<SaleWithProducts[]> => {
  const supabase = createClient();

  let query = supabase
    .from("sales")
    .select(
      `
      id,
      sale_date,
      notes,
      total_price,
      commission,
      order_type,
      customer_id,
      payment_method,
      payment_date,
      cash_amount,
      plin_amount,
      cash_received,
      table_number,
      user_id,
      customers (
        dni
      ),
      user_profiles (
        full_name
      ),
      sale_products (
        id,
        product_id,
        quantity,
        unit_price,
        status,
        temperatura,
        tipo_leche,
        loyalty_reward,
        products (
          name
        )
      )
    `
    );

  if (todayOnly) {
    query = query.gte("sale_date", getTodayStart());
  }

  const { data, error } = await query.order("sale_date", { ascending: false });

  if (error) {
    console.error("Error fetching sales:", error);
    throw new Error(error.message);
  }

  return (data || []).map((sale) => ({
    ...sale,
    customer_dni: (sale.customers as unknown as { dni: number | null } | null)?.dni ?? null,
    creator_name: (sale.user_profiles as unknown as { full_name: string | null } | null)?.full_name ?? null,
    sale_products: (
      sale.sale_products as unknown as Array<{
        id: number;
        product_id: number;
        quantity: number;
        unit_price: number;
        status: string;
        temperatura: string | null;
        tipo_leche: string | null;
        loyalty_reward: string | null;
        products: { name: string };
      }>
    ).map((sp) => ({
      id: sp.id,
      product_id: sp.product_id,
      quantity: sp.quantity,
      unit_price: sp.unit_price,
      product_name: sp.products?.name ?? "Producto eliminado",
      status: sp.status as "Pendiente" | "Entregado",
      temperatura: sp.temperatura,
      tipo_leche: sp.tipo_leche,
      loyalty_reward: sp.loyalty_reward,
    })),
  }));
};

export function groupSalesByDate(
  sales: SaleWithProducts[]
): SalesGroupedByDate[] {
  return groupByDate(sales, (s) => s.sale_date).map(({ date, items }) => ({
    date,
    dailyTotal: items.reduce((sum, s) => sum + getSaleNet(s), 0),
    sales: items,
  }));
}

export const useSales = ({ todayOnly = false }: { todayOnly?: boolean } = {}) => {
  const key = todayOnly ? "sales-today" : "sales";
  const { data, error, isLoading, mutate } = useSWR<SaleWithProducts[]>(
    key,
    () => fetchSales(todayOnly),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  return { sales: data ?? [], error, isLoading, mutate };
};
