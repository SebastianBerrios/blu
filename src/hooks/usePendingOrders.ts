"use client";

import { useEffect, useCallback } from "react";
import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/utils/auditLog";
import { getSaleNumber } from "@/utils/saleNumber";
import type { SaleWithProducts, SaleProductStatus } from "@/types";

export interface PendingOrderSale extends SaleWithProducts {
  pending_count: number;
  delivered_count: number;
}

function getTodayStart(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

const fetchTodayOrders = async (): Promise<PendingOrderSale[]> => {
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
      plin_amount,
      cash_received,
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
        loyalty_reward,
        products (
          name
        )
      )
    `
    )
    .gte("sale_date", getTodayStart())
    .order("sale_date", { ascending: true });

  if (error) {
    console.error("Error fetching pending orders:", error);
    throw new Error(error.message);
  }

  return (data || []).map((sale) => {
    const saleProducts = (
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
      status: sp.status as SaleProductStatus,
      temperatura: sp.temperatura,
      tipo_leche: sp.tipo_leche,
      loyalty_reward: sp.loyalty_reward,
    }));

    const pendingCount = saleProducts.filter(
      (p) => p.status === "Pendiente"
    ).length;

    return {
      ...sale,
      customer_dni:
        (sale.customers as unknown as { dni: number | null } | null)?.dni ??
        null,
      sale_products: saleProducts,
      pending_count: pendingCount,
      delivered_count: saleProducts.length - pendingCount,
    } as PendingOrderSale;
  });
};

export const usePendingOrders = () => {
  const { user, profile } = useAuth();
  const { data, error, isLoading, mutate } = useSWR<PendingOrderSale[]>(
    "pending-orders",
    fetchTodayOrders,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("pending-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sale_products",
        },
        () => {
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate]);

  const markAsDelivered = useCallback(
    async (itemId: number) => {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("sale_products")
        .update({ status: "Entregado" })
        .eq("id", itemId);

      if (updateError) throw updateError;

      await supabase.rpc("deduct_inventory_for_delivery", {
        p_sale_product_id: itemId,
        p_user_id: user?.id ?? null,
        p_user_name: profile?.full_name ?? null,
      });

      logAudit({
        userId: user?.id ?? null,
        userName: profile?.full_name ?? null,
        action: "cambiar_estado_pedido",
        targetTable: "sale_products",
        targetId: itemId,
        targetDescription: `Producto entregado (item #${itemId})`,
      });

      mutate();
    },
    [mutate, user, profile]
  );

  const markAllAsDelivered = useCallback(
    async (saleId: number) => {
      const supabase = createClient();

      const { data: pendingItems } = await supabase
        .from("sale_products")
        .select("id")
        .eq("sale_id", saleId)
        .eq("status", "Pendiente");

      const { error: updateError } = await supabase
        .from("sale_products")
        .update({ status: "Entregado" })
        .eq("sale_id", saleId)
        .eq("status", "Pendiente");

      if (updateError) throw updateError;

      if (pendingItems) {
        for (const item of pendingItems) {
          await supabase.rpc("deduct_inventory_for_delivery", {
            p_sale_product_id: item.id,
            p_user_id: user?.id ?? null,
            p_user_name: profile?.full_name ?? null,
          });
        }
      }

      const saleNumber = await getSaleNumber(saleId);

      logAudit({
        userId: user?.id ?? null,
        userName: profile?.full_name ?? null,
        action: "cambiar_estado_pedido",
        targetTable: "sale_products",
        targetId: saleId,
        targetDescription: `Todos los productos entregados (venta #${saleNumber})`,
      });

      mutate();
    },
    [mutate, user, profile]
  );

  const allOrders = data ?? [];
  const pendingOrders = allOrders.filter((s) => s.pending_count > 0);
  const completedOrders = allOrders.filter((s) => s.pending_count === 0);

  return {
    pendingOrders,
    completedOrders,
    error,
    isLoading,
    mutate,
    markAsDelivered,
    markAllAsDelivered,
  };
};
