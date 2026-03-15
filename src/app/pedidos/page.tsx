"use client";

import { useState } from "react";
import { ClipboardList, CheckCircle, CheckCheck } from "lucide-react";
import { usePendingOrders } from "@/hooks/usePendingOrders";
import type { PendingOrderSale } from "@/hooks/usePendingOrders";
import Spinner from "@/components/ui/Spinner";

const ORDER_TYPE_BADGE: Record<string, string> = {
  Mesa: "bg-blue-100 text-blue-700",
  "Para llevar": "bg-amber-100 text-amber-700",
  Delivery: "bg-green-100 text-green-700",
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OrderCard({
  sale,
  onDeliver,
  onDeliverAll,
  completed = false,
}: {
  sale: PendingOrderSale;
  onDeliver: (saleId: number, productId: number) => Promise<void>;
  onDeliverAll: (saleId: number) => Promise<void>;
  completed?: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleDeliver = async (productId: number) => {
    const key = `${sale.id}-${productId}`;
    setLoading(key);
    try {
      await onDeliver(sale.id, productId);
    } catch {
      alert("Error al marcar como entregado");
    } finally {
      setLoading(null);
    }
  };

  const handleDeliverAll = async () => {
    setLoading("all");
    try {
      await onDeliverAll(sale.id);
    } catch {
      alert("Error al marcar todos como entregados");
    } finally {
      setLoading(null);
    }
  };

  const total = sale.sale_products.length;
  const delivered = sale.delivered_count;

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden ${completed ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-primary-200"}`}>
      {/* Card header */}
      <div className={`px-5 py-4 border-b ${completed ? "border-gray-100 bg-gray-100/50" : "border-primary-100 bg-primary-50/50"}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-primary-900">
              {formatTime(sale.sale_date)}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                ORDER_TYPE_BADGE[sale.order_type] ?? "bg-gray-100 text-gray-700"
              }`}
            >
              {sale.order_type}
            </span>
            {sale.order_type === "Mesa" && sale.table_number && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                Mesa {sale.table_number}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-primary-600">
              {delivered} de {total} entregados
            </span>
            <div className="w-20 h-2 bg-primary-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(delivered / total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Product list */}
      <div className="divide-y divide-primary-100">
        {sale.sale_products.map((product) => {
          const isPending = product.status === "Pendiente";
          const isLoading = loading === `${sale.id}-${product.product_id}`;

          return (
            <div
              key={product.product_id}
              className={`px-5 py-3 flex items-center justify-between gap-3 transition-colors ${
                isPending ? "bg-white" : "bg-green-50/50"
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-medium text-primary-900 capitalize truncate">
                  {product.product_name}
                </span>
                <span className="text-xs text-primary-500 shrink-0">
                  x{product.quantity}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    isPending
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {product.status}
                </span>

                {isPending && (
                  <button
                    type="button"
                    onClick={() => handleDeliver(product.product_id)}
                    disabled={isLoading || loading === "all"}
                    className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                    title="Marcar como entregado"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Card footer */}
      {sale.pending_count > 0 && (
        <div className="px-5 py-3 border-t border-primary-200 bg-primary-50/30">
          <button
            type="button"
            onClick={handleDeliverAll}
            disabled={loading === "all"}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium text-sm"
          >
            {loading === "all" ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            Marcar todo como entregado
          </button>
        </div>
      )}
    </div>
  );
}

export default function PedidosPendientes() {
  const { pendingOrders, completedOrders, error, isLoading, markAsDelivered, markAllAsDelivered } =
    usePendingOrders();

  const hasAnyOrders = pendingOrders.length > 0 || completedOrders.length > 0;

  return (
    <section className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-primary-200 px-6 py-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-100 rounded-xl">
            <ClipboardList className="w-6 h-6 text-primary-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary-900">
              Pedidos Pendientes
            </h1>
            <p className="text-primary-600 mt-0.5 text-sm">
              {pendingOrders.length} pedido
              {pendingOrders.length !== 1 ? "s" : ""} por entregar
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-auto bg-primary-50">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-4">
            Error al cargar los pedidos
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner />
          </div>
        ) : !hasAnyOrders ? (
          <div className="flex flex-col items-center justify-center h-64 text-primary-500">
            <ClipboardList className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">No hay pedidos pendientes</p>
            <p className="text-sm mt-1">
              Los nuevos pedidos apareceran aqui automaticamente
            </p>
          </div>
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
                  <div className="flex-1 h-px bg-gray-300" />
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Entregados ({completedOrders.length})
                  </span>
                  <div className="flex-1 h-px bg-gray-300" />
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
