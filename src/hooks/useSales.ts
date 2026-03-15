import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { SaleWithProducts, SalesGroupedByDate } from "@/types";

const fetchSales = async (): Promise<SaleWithProducts[]> => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sales")
    .select(
      `
      id,
      sale_date,
      total_price,
      order_type,
      customer_id,
      payment_method,
      payment_date,
      cash_amount,
      yape_amount,
      table_number,
      user_id,
      customers (
        dni
      ),
      sale_products (
        product_id,
        quantity,
        unit_price,
        status,
        products (
          name
        )
      )
    `
    )
    .order("sale_date", { ascending: false });

  if (error) {
    console.error("Error fetching sales:", error);
    throw new Error(error.message);
  }

  return (data || []).map((sale) => ({
    ...sale,
    customer_dni: (sale.customers as unknown as { dni: number | null } | null)?.dni ?? null,
    sale_products: (
      sale.sale_products as unknown as Array<{
        product_id: number;
        quantity: number;
        unit_price: number;
        status: string;
        products: { name: string };
      }>
    ).map((sp) => ({
      product_id: sp.product_id,
      quantity: sp.quantity,
      unit_price: sp.unit_price,
      product_name: sp.products?.name ?? "Producto eliminado",
      status: sp.status as "Pendiente" | "Entregado",
    })),
  }));
};

export function groupSalesByDate(
  sales: SaleWithProducts[]
): SalesGroupedByDate[] {
  const groups: Record<string, SaleWithProducts[]> = {};

  for (const sale of sales) {
    const dateKey = sale.sale_date.slice(0, 10);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(sale);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, sales]) => ({
      date,
      dailyTotal: sales.reduce((sum, s) => sum + s.total_price, 0),
      sales,
    }));
}

export const useSales = () => {
  const { data, error, isLoading, mutate } = useSWR<SaleWithProducts[]>(
    "sales",
    fetchSales,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  return { sales: data ?? [], error, isLoading, mutate };
};
