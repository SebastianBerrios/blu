"use client";

import { useState } from "react";
import { redirect } from "next/navigation";
import { ClipboardList, CheckCircle, CheckCheck } from "lucide-react";
import { usePendingOrders } from "@/hooks/usePendingOrders";
import { usePermissions } from "@/hooks/usePermissions";
import type { PendingOrderSale } from "@/hooks/usePendingOrders";
import Skeleton from "@/components/ui/Skeleton";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Badge, { ORDER_TYPE_TONE } from "@/components/ui/Badge";
import StaleDataBanner from "@/components/ui/StaleDataBanner";
import type { OrderType } from "@/types";

import { formatTime } from "@/utils/helpers/dateFormatters";

function OrderCard({
  sale,
  onDeliver,
  onDeliverAll,
  completed = false,
}: {
  sale: PendingOrderSale;
  onDeliver: (itemId: number) => Promise<void>;
  onDeliverAll: (saleId: number) => Promise<void>;
  completed?: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDeliver = async (itemId: number) => {
    const key = `item-${itemId}`;
    setLoading(key);
    setError(null);
    try {
      await onDeliver(itemId);
    } catch {
      setError("Error al marcar como entregado");
    } finally {
      setLoading(null);
    }
  };

  const handleDeliverAll = async () => {
    setLoading("all");
    setError(null);
    try {
      await onDeliverAll(sale.id);
    } catch {
      setError("Error al marcar todos como entregados");
    } finally {
      setLoading(null);
    }
  };

  const total = sale.sale_products.length;
  const delivered = sale.delivered_count;

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden ${completed ? "bg-slate-50 border-slate-200 opacity-60" : "bg-white border-slate-200"}`}>
      {/* Card header */}
      <div className={`px-4 md:px-5 py-3 md:py-4 border-b ${completed ? "border-slate-100 bg-slate-100/50" : "border-primary-100 bg-primary-50/50"}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-base md:text-lg font-semibold text-slate-900">
              {formatTime(sale.sale_date)}
            </span>
            <Badge
              tone={ORDER_TYPE_TONE[sale.order_type as OrderType] ?? "neutral"}
              size="lg"
            >
              {sale.order_type}
              {sale.order_type === "Mesa" && sale.table_number
                ? ` ${sale.table_number}`
                : ""}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {delivered} de {total} entregados
            </span>
            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(delivered / total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {sale.notes && (
        <div className="px-4 md:px-5 py-2.5 bg-amber-50 border-b border-amber-200">
          <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider mb-0.5">
            Nota del pedido
          </p>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{sale.notes}</p>
        </div>
      )}

      {/* Product list */}
      <div className="divide-y divide-slate-100">
        {sale.sale_products.map((product) => {
          const isPending = product.status === "Pendiente";
          const isLoading = loading === `item-${product.id}`;

          return (
            <div
              key={product.id}
              className={`px-4 md:px-5 py-3 flex items-center justify-between gap-3 transition-colors ${
                isPending ? "bg-white" : "bg-green-50/50"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-900 capitalize truncate">
                    {product.product_name}
                  </span>
                  <span className="text-xs text-slate-500 shrink-0">
                    x{product.quantity}
                  </span>
                </div>
                {(product.temperatura || product.tipo_leche) && (
                  <div className="flex gap-1.5 mt-1">
                    {product.temperatura && (
                      <Badge tone={product.temperatura === "caliente" ? "tempCaliente" : "tempFrio"} size="sm">
                        {product.temperatura}
                      </Badge>
                    )}
                    {product.tipo_leche && (
                      <Badge tone="milkType" size="sm">
                        {product.tipo_leche}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge tone={isPending ? "prepPending" : "delivered"}>
                  {product.status}
                </Badge>

                {isPending && (
                  <button
                    type="button"
                    onClick={() => handleDeliver(product.id)}
                    disabled={isLoading || loading === "all"}
                    className="p-2.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    title="Marcar como entregado"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="px-4 md:px-5 py-2 border-t border-red-100">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Card footer */}
      {sale.pending_count > 0 && (
        <div className="px-4 md:px-5 py-3 border-t border-slate-200 bg-slate-50/30">
          <button
            type="button"
            onClick={handleDeliverAll}
            disabled={loading === "all"}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium text-sm active:scale-[0.97] min-h-[44px]"
          >
            {loading === "all" ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCheck className="w-5 h-5" />
            )}
            Marcar todo como entregado
          </button>
        </div>
      )}
    </div>
  );
}

export default function PedidosPendientes() {
  const { can, isLoading: permsLoading } = usePermissions();

  if (!permsLoading && !can("module.pedidos")) {
    redirect("/");
  }

  const { pendingOrders, completedOrders, error, isLoading, mutate, markAsDelivered, markAllAsDelivered, realtimeStatus } =
    usePendingOrders();

  const hasAnyOrders = pendingOrders.length > 0 || completedOrders.length > 0;

  return (
    <section className="h-full flex flex-col bg-slate-50">
      <PageHeader
        title="Pedidos Pendientes"
        subtitle={`${pendingOrders.length} pedido${pendingOrders.length !== 1 ? "s" : ""} por entregar`}
        icon={<ClipboardList className="w-6 h-6 text-primary-700" />}
      />

      <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto">
        <StaleDataBanner status={realtimeStatus} onRetry={() => mutate()} />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-4">
            Error al cargar los pedidos
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 max-w-3xl mx-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                <div className="px-4 md:px-5 py-3 md:py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="divide-y divide-slate-100">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="px-4 md:px-5 py-3 flex items-center justify-between gap-3">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-7 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
                <div className="px-4 md:px-5 py-3 border-t border-slate-200 bg-slate-50/30">
                  <Skeleton className="h-11 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasAnyOrders ? (
          <EmptyState
            icon={<ClipboardList className="w-12 h-12" />}
            title="No hay pedidos pendientes"
            description="Los nuevos pedidos aparecerán aquí automáticamente"
          />
        ) : (
          <div className="grid gap-4 max-w-3xl mx-auto">
            {pendingOrders.map((sale) => (
              <OrderCard
                key={sale.id}
                sale={sale}
                onDeliver={markAsDelivered}
                onDeliverAll={markAllAsDelivered}
              />
            ))}

            {completedOrders.length > 0 && (
              <>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 h-px bg-slate-300" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Entregados ({completedOrders.length})
                  </span>
                  <div className="flex-1 h-px bg-slate-300" />
                </div>

                {completedOrders.map((sale) => (
                  <OrderCard
                    key={sale.id}
                    sale={sale}
                    onDeliver={markAsDelivered}
                    onDeliverAll={markAllAsDelivered}
                    completed
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
