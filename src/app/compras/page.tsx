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
import { logAudit } from "@/utils/auditLog";
import type { PurchaseWithItems } from "@/types";
import PurchaseForm from "@/components/forms/PurchaseForm";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import PageHeader from "@/components/ui/PageHeader";
import FAB from "@/components/ui/FAB";
import EmptyState from "@/components/ui/EmptyState";

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
  const { isAdmin, user, profile } = useAuth();
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
    const { error } = await supabase.from("purchases").delete().eq("id", purchase.id);
    if (!error) {
      logAudit({
        userId: user?.id ?? null,
        userName: profile?.full_name ?? null,
        action: "eliminar",
        targetTable: "purchases",
        targetId: purchase.id,
        targetDescription: `Compra #${purchase.id} - S/ ${purchase.total.toFixed(2)}`,
      });
    }
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
      <section className="h-full flex flex-col bg-slate-50">
        <PageHeader
          title="Compras"
          subtitle="Registra y consulta las compras de insumos"
          icon={<ShoppingCart className="w-6 h-6 text-primary-700" />}
          action={
            <Button variant="primary" icon={true} onClick={handleCreate}>
              Registrar compra
            </Button>
          }
        />

        <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">Error al cargar las compras: {error.message}</p>
            </div>
          )}

          {isLoading && <Spinner text="Cargando compras..." size="md" />}

          {!isLoading && purchases.length === 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900">Historial de Compras</h3>
                  <span className="text-sm text-slate-500">0 registros</span>
                </div>
              </div>
              <EmptyState
                icon={<ShoppingCart className="w-12 h-12" />}
                title="No hay compras"
                description="No se encontraron compras registradas"
              />
            </div>
          )}

          {!isLoading && purchases.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-semibold text-slate-900">Historial de Compras</h3>
                <span className="text-sm text-slate-500">{purchases.length} registros</span>
              </div>

              {groupedPurchases.map((group) => (
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
                    {group.purchases.map((purchase) => {
                      const isExpanded = expandedPurchaseId === purchase.id;

                      return (
                        <div
                          key={purchase.id}
                          className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
                        >
                          {/* Collapsed row */}
                          <div
                            className="flex items-center justify-between px-3 md:px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors min-h-[44px]"
                            onClick={() => toggleExpand(purchase.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-slate-600 font-medium">
                                  {formatTime(purchase.created_at)}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">
                                  {purchase.purchaser_name ?? "Usuario"}
                                </span>
                                {purchase.has_delivery && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 flex items-center gap-1">
                                    <Truck className="w-3 h-3" />
                                    Delivery
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-1 md:hidden">
                                <span className="text-xs text-slate-500">
                                  {purchase.purchase_items.length} ítem{purchase.purchase_items.length !== 1 ? "s" : ""}
                                </span>
                                <span className="font-bold text-slate-900 text-sm">
                                  S/ {purchase.total.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div className="hidden md:flex items-center gap-3">
                              <span className="text-sm text-slate-500">
                                {purchase.purchase_items.length} ítem{purchase.purchase_items.length !== 1 ? "s" : ""}
                              </span>
                              <span className="font-bold text-slate-900">
                                S/ {purchase.total.toFixed(2)}
                              </span>
                              <div className="flex items-center gap-1">
                                {isAdmin && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(purchase); }}
                                    className="p-3 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
                                    title="Editar"
                                  >
                                    <SquarePen className="w-5 h-5" />
                                  </button>
                                )}
                                {isAdmin && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(purchase); }}
                                    className="p-3 text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>

                            <div className="md:hidden ml-2">
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="border-t border-slate-200 px-3 md:px-4 py-3 bg-slate-50/50">
                              <table className="w-full">
                                <thead>
                                  <tr>
                                    <th className="text-left text-xs font-medium text-slate-600 uppercase pb-2">Ítem</th>
                                    <th className="text-left text-xs font-medium text-slate-600 uppercase pb-2">Ingrediente</th>
                                    <th className="text-right text-xs font-medium text-slate-600 uppercase pb-2">Precio</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {purchase.purchase_items.map((item) => (
                                    <tr key={item.id}>
                                      <td className="py-2 text-sm text-slate-900 capitalize">{item.item_name}</td>
                                      <td className="py-2 text-sm">
                                        {item.ingredient_id ? (
                                          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">Vinculado</span>
                                        ) : (
                                          <span className="text-slate-400">-</span>
                                        )}
                                      </td>
                                      <td className="py-2 text-sm text-green-700 text-right font-semibold">S/ {item.price.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                                {purchase.has_delivery && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600 flex items-center gap-1">
                                      <Truck className="w-3.5 h-3.5" />
                                      Delivery
                                    </span>
                                    <span className="font-medium text-slate-900">
                                      S/ {(purchase.delivery_cost ?? 0).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {purchase.notes && (
                                  <div className="text-sm">
                                    <span className="text-slate-600">Notas: </span>
                                    <span className="text-slate-900">{purchase.notes}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm font-bold pt-1">
                                  <span className="text-slate-900">Total</span>
                                  <span className="text-green-700">S/ {purchase.total.toFixed(2)}</span>
                                </div>
                              </div>

                              {/* Mobile action buttons */}
                              {isAdmin && (
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 md:hidden">
                                  <button
                                    onClick={() => handleEdit(purchase)}
                                    className="p-3 text-primary-700 bg-primary-50 rounded-lg"
                                  >
                                    <SquarePen className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(purchase)}
                                    className="p-3 text-red-700 bg-red-50 rounded-lg"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              )}
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

      <FAB onClick={handleCreate} label="Registrar compra" />

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
