"use client";

import { useState, useMemo } from "react";
import { ShoppingCart, ChevronDown, ChevronUp, SquarePen, Trash2, Banknote } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useSales, groupSalesByDate } from "@/hooks/useSales";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import type { SaleWithProducts } from "@/types";
import SaleForm from "@/components/forms/SaleForm";
import PaymentModal from "@/components/forms/PaymentModal";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

const ORDER_TYPE_BADGE: Record<string, string> = {
  Mesa: "bg-blue-100 text-blue-700",
  "Para llevar": "bg-amber-100 text-amber-700",
  Delivery: "bg-green-100 text-green-700",
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

export default function Sales() {
  const { sales, error, isLoading, mutate } = useSales();
  const { products } = useProducts();
  const { isAdmin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithProducts | undefined>();
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentSale, setPaymentSale] = useState<SaleWithProducts | undefined>();

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

    const supabase = createClient();
    await supabase.from("sales").delete().eq("id", sale.id);
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
      <section className="h-full flex flex-col bg-primary-50">
        <header className="bg-white border-b border-primary-200 px-6 py-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-xl">
                <ShoppingCart className="w-6 h-6 text-primary-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary-900">Ventas</h1>
                <p className="text-primary-700 mt-1">
                  Registra y consulta tus ventas
                </p>
              </div>
            </div>
            <Button variant="primary" icon={true} onClick={handleCreate}>
              Registrar venta
            </Button>
          </div>
        </header>

        <div className="flex-1 px-6 py-6 overflow-auto bg-primary-50">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                Error al cargar las ventas: {error.message}
              </p>
            </div>
          )}

          {isLoading && (
            <div className="py-12">
              <Spinner text="Cargando ventas..." size="md" />
            </div>
          )}

          {!isLoading && sales.length === 0 && (
            <div className="bg-white rounded-lg border border-primary-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-primary-200 bg-primary-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary-900">
                    Historial de Ventas
                  </h3>
                  <span className="text-sm text-primary-700">0 registros</span>
                </div>
              </div>
              <div className="text-center py-12 px-6">
                <div className="max-w-sm mx-auto">
                  <h3 className="text-lg font-medium text-primary-900 mb-2">
                    No hay ventas
                  </h3>
                  <p className="text-primary-700 mb-6">
                    No se encontraron ventas registradas
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && sales.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary-900">
                  Historial de Ventas
                </h3>
                <span className="text-sm text-primary-700">
                  {sales.length} registros
                </span>
              </div>

              {groupedSales.map((group) => (
                <div key={group.date}>
                  {/* Encabezado de fecha */}
                  <div className="flex justify-between items-center px-4 py-3 bg-primary-100 rounded-lg mb-2">
                    <span className="font-semibold text-primary-900 capitalize">
                      {formatDate(group.date)}
                    </span>
                    <span className="font-bold text-green-700">
                      Total del dia: S/ {group.dailyTotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Tarjetas de ventas */}
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
                              ? "border-primary-200"
                              : "border-primary-200 border-l-4 border-l-red-400"
                          }`}
                        >
                          {/* Fila colapsada */}
                          <div
                            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-primary-50 transition-colors"
                            onClick={() => toggleExpand(sale.id)}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-primary-600 font-medium min-w-[50px]">
                                {formatTime(sale.sale_date)}
                              </span>
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}`}
                              >
                                {sale.order_type}
                              </span>
                              {sale.payment_method ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                  Pagado
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                  Pendiente
                                </span>
                              )}
                              {sale.customer_dni && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                  DNI: {sale.customer_dni}
                                </span>
                              )}
                              <span className="text-sm text-primary-600">
                                {sale.sale_products.length} producto
                                {sale.sale_products.length !== 1 ? "s" : ""}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-bold text-primary-900">
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
                                    className="p-2 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                                    title="Registrar pago"
                                  >
                                    <Banknote className="w-4 h-4" />
                                  </button>
                                )}
                                {isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(sale);
                                    }}
                                    className="p-2 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
                                    title="Editar"
                                  >
                                    <SquarePen className="w-4 h-4" />
                                  </button>
                                )}
                                {isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(sale);
                                    }}
                                    className="p-2 text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-primary-500" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-primary-500" />
                              )}
                            </div>
                          </div>

                          {/* Detalle expandido */}
                          {isExpanded && (
                            <div className="border-t border-primary-200 px-4 py-3 bg-primary-50/50">
                              <table className="w-full">
                                <thead>
                                  <tr>
                                    <th className="text-left text-xs font-medium text-primary-700 uppercase pb-2">
                                      Producto
                                    </th>
                                    <th className="text-center text-xs font-medium text-primary-700 uppercase pb-2">
                                      Cant.
                                    </th>
                                    <th className="text-right text-xs font-medium text-primary-700 uppercase pb-2">
                                      P. Unit.
                                    </th>
                                    <th className="text-right text-xs font-medium text-primary-700 uppercase pb-2">
                                      Subtotal
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-primary-200">
                                  {sale.sale_products.map((sp) => (
                                    <tr key={sp.product_id}>
                                      <td className="py-2 text-sm text-primary-900 capitalize">
                                        {sp.product_name}
                                      </td>
                                      <td className="py-2 text-sm text-primary-900 text-center">
                                        {sp.quantity}
                                      </td>
                                      <td className="py-2 text-sm text-primary-900 text-right">
                                        S/ {sp.unit_price.toFixed(2)}
                                      </td>
                                      <td className="py-2 text-sm text-green-700 text-right font-semibold">
                                        S/ {(sp.quantity * sp.unit_price).toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              {/* Detalle de pago */}
                              <div className="mt-3 pt-3 border-t border-primary-200">
                                {sale.payment_method ? (
                                  <div className="flex flex-wrap items-center gap-3 text-sm">
                                    <span className="text-primary-600">Pago:</span>
                                    <span className="font-medium text-primary-900">{sale.payment_method}</span>
                                    {sale.payment_method === "Efectivo + Yape" && (
                                      <span className="text-primary-600">
                                        (Efectivo: S/ {sale.cash_amount?.toFixed(2)} | Yape: S/ {sale.yape_amount?.toFixed(2)})
                                      </span>
                                    )}
                                    {sale.payment_date && (
                                      <span className="text-primary-500 text-xs">
                                        {formatTime(sale.payment_date)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm text-red-600 font-medium">Pago pendiente</span>
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
