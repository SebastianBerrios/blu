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
        id,
        product_id,
        quantity,
        unit_price,
        status,
        temperatura,
        tipo_leche,
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
        id: number;
        product_id: number;
        quantity: number;
        unit_price: number;
        status: string;
        temperatura: string | null;
        tipo_leche: string | null;
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
