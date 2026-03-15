"use client";

import { useState, useMemo } from "react";
import {
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  SquarePen,
  Trash2,
  Truck,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { usePurchases, groupPurchasesByDate } from "@/hooks/usePurchases";
import { useIngredients } from "@/hooks/useIngredients";
import { useAuth } from "@/hooks/useAuth";
import type { PurchaseWithItems } from "@/types";
import PurchaseForm from "@/components/forms/PurchaseForm";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

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

export default function Compras() {
  const { purchases, error, isLoading, mutate } = usePurchases();
  const { ingredients } = useIngredients();
  const { isAdmin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseWithItems | undefined>();
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<number | null>(null);

  const groupedPurchases = useMemo(
    () => groupPurchasesByDate(purchases),
    [purchases]
  );

  const handleCreate = () => {
    setSelectedPurchase(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (purchase: PurchaseWithItems) => {
    setSelectedPurchase(purchase);
    setIsModalOpen(true);
  };

  const handleDelete = async (purchase: PurchaseWithItems) => {
    if (!confirm("¿Estás seguro de eliminar esta compra?")) return;

    const supabase = createClient();
    await supabase.from("purchases").delete().eq("id", purchase.id);
    mutate();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPurchase(undefined);
  };

  const handleSuccess = () => {
    mutate();
  };

  const toggleExpand = (purchaseId: number) => {
    setExpandedPurchaseId((prev) => (prev === purchaseId ? null : purchaseId));
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
                <h1 className="text-2xl font-bold text-primary-900">Compras</h1>
                <p className="text-primary-700 mt-1">
                  Registra y consulta las compras de insumos
                </p>
              </div>
            </div>
            <Button variant="primary" icon={true} onClick={handleCreate}>
              Registrar compra
            </Button>
          </div>
        </header>

        <div className="flex-1 px-6 py-6 overflow-auto bg-primary-50">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                Error al cargar las compras: {error.message}
              </p>
            </div>
          )}

          {isLoading && (
            <div className="py-12">
              <Spinner text="Cargando compras..." size="md" />
            </div>
          )}

          {!isLoading && purchases.length === 0 && (
            <div className="bg-white rounded-lg border border-primary-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-primary-200 bg-primary-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary-900">
                    Historial de Compras
                  </h3>
                  <span className="text-sm text-primary-700">0 registros</span>
                </div>
              </div>
              <div className="text-center py-12 px-6">
                <div className="max-w-sm mx-auto">
                  <h3 className="text-lg font-medium text-primary-900 mb-2">
                    No hay compras
                  </h3>
                  <p className="text-primary-700 mb-6">
                    No se encontraron compras registradas
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && purchases.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary-900">
                  Historial de Compras
                </h3>
                <span className="text-sm text-primary-700">
                  {purchases.length} registros
                </span>
              </div>

              {groupedPurchases.map((group) => (
                <div key={group.date}>
                  {/* Encabezado de fecha */}
                  <div className="flex justify-between items-center px-4 py-3 bg-primary-100 rounded-lg mb-2">
                    <span className="font-semibold text-primary-900 capitalize">
                      {formatDate(group.date)}
                    </span>
                    <span className="font-bold text-green-700">
                      Total del día: S/ {group.dailyTotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Tarjetas de compras */}
                  <div className="space-y-2">
                    {group.purchases.map((purchase) => {
                      const isExpanded = expandedPurchaseId === purchase.id;

                      return (
                        <div
                          key={purchase.id}
                          className="bg-white rounded-lg border border-primary-200 shadow-sm overflow-hidden"
                        >
                          {/* Fila colapsada */}
                          <div
                            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-primary-50 transition-colors"
                            onClick={() => toggleExpand(purchase.id)}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-primary-600 font-medium min-w-[50px]">
                                {formatTime(purchase.created_at)}
                              </span>
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">
                                {purchase.purchaser_name ?? "Usuario"}
                              </span>
                              <span className="text-sm text-primary-600">
                                {purchase.purchase_items.length} ítem
                                {purchase.purchase_items.length !== 1 ? "s" : ""}
                              </span>
                              {purchase.has_delivery && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 flex items-center gap-1">
                                  <Truck className="w-3 h-3" />
                                  Delivery
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-bold text-primary-900">
                                S/ {purchase.total.toFixed(2)}
                              </span>
                              <div className="flex items-center gap-1">
                                {isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(purchase);
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
                                      handleDelete(purchase);
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
                                      Ítem
                                    </th>
                                    <th className="text-left text-xs font-medium text-primary-700 uppercase pb-2">
                                      Ingrediente
                                    </th>
                                    <th className="text-right text-xs font-medium text-primary-700 uppercase pb-2">
                                      Precio
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-primary-200">
                                  {purchase.purchase_items.map((item) => (
                                    <tr key={item.id}>
                                      <td className="py-2 text-sm text-primary-900 capitalize">
                                        {item.item_name}
                                      </td>
                                      <td className="py-2 text-sm">
                                        {item.ingredient_id ? (
                                          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                                            Vinculado
                                          </span>
                                        ) : (
                                          <span className="text-primary-400">-</span>
                                        )}
                                      </td>
                                      <td className="py-2 text-sm text-green-700 text-right font-semibold">
                                        S/ {item.price.toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              {/* Detalle adicional */}
                              <div className="mt-3 pt-3 border-t border-primary-200 space-y-2">
                                {purchase.has_delivery && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-primary-600 flex items-center gap-1">
                                      <Truck className="w-3.5 h-3.5" />
                                      Delivery
                                    </span>
                                    <span className="font-medium text-primary-900">
                                      S/ {(purchase.delivery_cost ?? 0).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {purchase.notes && (
                                  <div className="text-sm">
                                    <span className="text-primary-600">Notas: </span>
                                    <span className="text-primary-900">
                                      {purchase.notes}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm font-bold pt-1">
                                  <span className="text-primary-900">Total</span>
                                  <span className="text-green-700">
                                    S/ {purchase.total.toFixed(2)}
                                  </span>
                                </div>
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

      <PurchaseForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        purchase={selectedPurchase}
        ingredients={ingredients}
      />
    </>
  );
}
