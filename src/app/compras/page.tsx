"use client";

import { useState, useMemo } from "react";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { usePurchases, groupPurchasesByDate } from "@/hooks/usePurchases";
import { useIngredients } from "@/hooks/useIngredients";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/hooks/useConfirm";
import { deletePurchase } from "@/features/compras/services/purchasesService";
import type { PurchaseWithItems } from "@/types";
import PurchaseForm from "@/components/forms/PurchaseForm";
import PurchasesGroupedList from "@/features/compras/components/PurchasesGroupedList";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import PageHeader from "@/components/ui/PageHeader";
import FAB from "@/components/ui/FAB";
import EmptyState from "@/components/ui/EmptyState";

export default function Compras() {
  const { purchases, error, isLoading, mutate } = usePurchases();
  const { ingredients } = useIngredients();
  const { isAdmin, user, profile } = useAuth();
  const confirm = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseWithItems | undefined>();
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<number | null>(null);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

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
    const ok = await confirm({
      title: "¿Eliminar compra?",
      description: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deletePurchase(purchase.id, user?.id ?? null, profile?.full_name ?? null);
      mutate();
      toast.success("Compra eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar la compra");
    }
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

  const toggleDateGroup = (date: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
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

              <PurchasesGroupedList
                groupedPurchases={groupedPurchases}
                expandedPurchaseId={expandedPurchaseId}
                collapsedDates={collapsedDates}
                isAdmin={isAdmin}
                onToggleExpand={toggleExpand}
                onToggleDateGroup={toggleDateGroup}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
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
