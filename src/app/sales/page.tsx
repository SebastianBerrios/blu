"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  ChevronDown,
  ChevronUp,
  SquarePen,
  Trash2,
  Banknote,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useSales, groupSalesByDate } from "@/hooks/useSales";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/utils/auditLog";
import { getSaleNumber } from "@/utils/saleNumber";
import type { SaleWithProducts } from "@/types";
import SaleForm from "@/components/forms/SaleForm";
import PaymentModal from "@/components/forms/PaymentModal";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import PageHeader from "@/components/ui/PageHeader";
import FAB from "@/components/ui/FAB";
import EmptyState from "@/components/ui/EmptyState";

const ORDER_TYPE_BADGE: Record<string, string> = {
  Mesa: "bg-blue-100 text-blue-700",
  "Para llevar": "bg-amber-100 text-amber-700",
  Delivery: "bg-green-100 text-green-700",
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Sales() {
  const { isAdmin, user, profile } = useAuth();
  const { sales, error, isLoading, mutate } = useSales({ todayOnly: !isAdmin });
  const { products } = useProducts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<
    SaleWithProducts | undefined
  >();
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentSale, setPaymentSale] = useState<
    SaleWithProducts | undefined
  >();

  const groupedSales = useMemo(() => groupSalesByDate(sales), [sales]);

  const handleCreate = () => {
    setSelectedSale(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (sale: SaleWithProducts) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  const handleDelete = async (sale: SaleWithProducts) => {
    if (!confirm("¿Estás seguro de eliminar esta venta?")) return;
    const saleNumber = await getSaleNumber(sale.id);
    const supabase = createClient();
    const { error } = await supabase.from("sales").delete().eq("id", sale.id);
    if (!error) {
      logAudit({
        userId: user?.id ?? null,
        userName: profile?.full_name ?? null,
        action: "eliminar",
        targetTable: "sales",
        targetId: sale.id,
        targetDescription: `Venta #${saleNumber} - S/ ${sale.total_price.toFixed(2)}`,
      });
    }
    mutate();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSale(undefined);
  };

  const handleSuccess = () => {
    mutate();
  };

  const toggleExpand = (saleId: number) => {
    setExpandedSaleId((prev) => (prev === saleId ? null : saleId));
  };

  return (
    <>
      <section className="h-full flex flex-col bg-slate-50">
        <PageHeader
          title="Ventas"
          subtitle={isAdmin ? "Registra y consulta tus ventas" : "Ventas del día"}
          icon={<TrendingUp className="w-6 h-6 text-primary-700" />}
          action={
            <Button variant="primary" icon={true} onClick={handleCreate}>
              Registrar venta
            </Button>
          }
        />

        <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                Error al cargar las ventas: {error.message}
              </p>
            </div>
          )}

          {isLoading && <Spinner text="Cargando ventas..." size="md" />}

          {!isLoading && sales.length === 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900">
                    Historial de Ventas
                  </h3>
                  <span className="text-sm text-slate-500">0 registros</span>
                </div>
              </div>
              <EmptyState
                icon={<TrendingUp className="w-12 h-12" />}
                title="No hay ventas"
                description="No se encontraron ventas registradas"
              />
            </div>
          )}

          {!isLoading && sales.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-semibold text-slate-900">
                  Historial de Ventas
                </h3>
                <span className="text-sm text-slate-500">
                  {sales.length} registros
                </span>
              </div>

              {groupedSales.map((group) => (
                <div key={group.date}>
                  <div className="flex justify-between items-center px-3 md:px-4 py-2.5 md:py-3 bg-primary-100 rounded-lg mb-2">
                    <span className="font-semibold text-primary-900 capitalize text-sm md:text-base">
                      {formatDate(group.date)}
                    </span>
                    <span className="font-bold text-green-700 text-sm">
                      Total: S/ {group.dailyTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {group.sales.map((sale) => {
                      const isExpanded = expandedSaleId === sale.id;
                      const badgeClass =
                        ORDER_TYPE_BADGE[sale.order_type] ||
                        "bg-gray-100 text-gray-700";

                      return (
                        <div
                          key={sale.id}
                          className={`bg-white rounded-lg border shadow-sm overflow-hidden ${
                            sale.payment_method
                              ? "border-slate-200"
                              : "border-slate-200 border-l-4 border-l-red-400"
                          }`}
                        >
                          {/* Collapsed row */}
                          <div
                            className="flex items-center justify-between px-3 md:px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors min-h-[44px]"
                            onClick={() => toggleExpand(sale.id)}
                          >
                            <div className="flex-1 min-w-0">
                              {/* Mobile: 2-line layout */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-slate-600 font-medium">
                                  {formatTime(sale.sale_date)}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}
                                >
                                  {sale.order_type}
                                  {sale.order_type === "Mesa" && sale.table_number
                                    ? ` ${sale.table_number}`
                                    : ""}
                                </span>
                                {sale.payment_method ? (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                    Pagado
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                    Pendiente
                                  </span>
                                )}
                                {sale.customer_dni && (
                                  <span className="hidden md:inline px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                    DNI: {sale.customer_dni}
                                  </span>
                                )}
                              </div>
                              {sale.creator_name && (
                                <div className="mt-0.5">
                                  <span className="text-xs text-slate-400">
                                    por {sale.creator_name}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between mt-1 md:hidden">
                                <span className="text-xs text-slate-500">
                                  {sale.sale_products.length} producto
                                  {sale.sale_products.length !== 1 ? "s" : ""}
                                </span>
                                <span className="font-bold text-slate-900 text-sm">
                                  S/ {sale.total_price.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div className="hidden md:flex items-center gap-3">
                              <span className="text-sm text-slate-600">
                                {sale.sale_products.length} producto
                                {sale.sale_products.length !== 1 ? "s" : ""}
                              </span>
                              <span className="font-bold text-slate-900">
                                S/ {sale.total_price.toFixed(2)}
                              </span>
                              <div className="flex items-center gap-1">
                                {!sale.payment_method && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPaymentSale(sale);
                                      setIsPaymentModalOpen(true);
                                    }}
                                    className="p-3 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                                    title="Registrar pago"
                                  >
                                    <Banknote className="w-5 h-5" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(sale);
                                  }}
                                  className="p-3 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <SquarePen className="w-5 h-5" />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(sale);
                                    }}
                                    className="p-3 text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>

                            {/* Mobile chevron */}
                            <div className="md:hidden ml-2">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="border-t border-slate-200 px-3 md:px-4 py-3 bg-slate-50/50">
                              <table className="w-full">
                                <thead>
                                  <tr>
                                    <th className="text-left text-xs font-medium text-slate-600 uppercase pb-2">
                                      Producto
                                    </th>
                                    <th className="text-center text-xs font-medium text-slate-600 uppercase pb-2">
                                      Cant.
                                    </th>
                                    <th className="text-right text-xs font-medium text-slate-600 uppercase pb-2">
                                      P. Unit.
                                    </th>
                                    <th className="text-right text-xs font-medium text-slate-600 uppercase pb-2">
                                      Subtotal
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {sale.sale_products.map((sp) => (
                                    <tr key={sp.id}>
                                      <td className="py-2 text-sm text-slate-900 capitalize">
                                        {sp.product_name}
                                        {(sp.temperatura || sp.tipo_leche) && (
                                          <div className="flex gap-1.5 mt-0.5">
                                            {sp.temperatura && (
                                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                                                {sp.temperatura}
                                              </span>
                                            )}
                                            {sp.tipo_leche && (
                                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                                                {sp.tipo_leche}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2 text-sm text-slate-900 text-center">
                                        {sp.quantity}
                                      </td>
                                      <td className="py-2 text-sm text-slate-900 text-right">
                                        S/ {sp.unit_price.toFixed(2)}
                                      </td>
                                      <td className="py-2 text-sm text-green-700 text-right font-semibold">
                                        S/{" "}
                                        {(sp.quantity * sp.unit_price).toFixed(
                                          2,
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              {/* Mobile action buttons */}
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 md:hidden">
                                {!sale.payment_method && (
                                  <button
                                    onClick={() => {
                                      setPaymentSale(sale);
                                      setIsPaymentModalOpen(true);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg font-medium text-sm active:scale-[0.97]"
                                  >
                                    <Banknote className="w-5 h-5" />
                                    Pagar
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEdit(sale)}
                                  className="p-3 text-primary-700 bg-primary-50 rounded-lg"
                                >
                                  <SquarePen className="w-5 h-5" />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDelete(sale)}
                                    className="p-3 text-red-700 bg-red-50 rounded-lg"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                )}
                              </div>

                              {/* Payment detail */}
                              <div className="mt-3 pt-3 border-t border-slate-200">
                                {sale.payment_method ? (
                                  <div className="flex flex-wrap items-center gap-3 text-sm">
                                    <span className="text-slate-600">
                                      Pago:
                                    </span>
                                    <span className="font-medium text-slate-900">
                                      {sale.payment_method}
                                    </span>
                                    {sale.payment_method ===
                                      "Efectivo + Yape" && (
                                      <span className="text-slate-500">
                                        (Efectivo: S/{" "}
                                        {sale.cash_amount?.toFixed(2)} | Yape:
                                        S/ {sale.yape_amount?.toFixed(2)})
                                      </span>
                                    )}
                                    {sale.payment_date && (
                                      <span className="text-slate-400 text-xs">
                                        {formatTime(sale.payment_date)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm text-red-600 font-medium">
                                    Pago pendiente
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <FAB onClick={handleCreate} label="Registrar venta" />

      <SaleForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        sale={selectedSale}
        products={products}
      />

      {paymentSale && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPaymentSale(undefined);
          }}
          onSuccess={handleSuccess}
          sale={paymentSale}
        />
      )}
    </>
  );
}
