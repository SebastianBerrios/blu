"use client";

import { useState, useMemo } from "react";
import { TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { useSales, groupSalesByDate } from "@/hooks/useSales";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useConfirm } from "@/hooks/useConfirm";
import { deleteSale } from "@/features/ventas";
import type { SaleWithProducts } from "@/types";
import SaleForm from "@/components/forms/SaleForm";
import PaymentModal from "@/components/forms/PaymentModal";
import SalesGroupedList from "@/features/ventas/components/SalesGroupedList";
import Button from "@/components/ui/Button";
import { SkeletonCard } from "@/components/ui/Skeleton";
import PageHeader from "@/components/ui/PageHeader";
import FAB from "@/components/ui/FAB";
import EmptyState from "@/components/ui/EmptyState";

export default function Sales() {
  const { isAdmin, user, profile } = useAuth();
  const { can } = usePermissions();
  const canEditAnyDate = can("sales.edit_any_date");
  const canDeleteSales = can("sales.delete");
  const canSeeAllDates = isAdmin || canEditAnyDate;
  const confirm = useConfirm();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { sales, error, isLoading, mutate } = useSales({
    todayOnly: !canSeeAllDates,
    startDate: canSeeAllDates ? startDate || undefined : undefined,
    endDate: canSeeAllDates ? endDate || undefined : undefined,
  });
  const { products } = useProducts();
  const { categories } = useCategories();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithProducts | undefined>();
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
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
    try {
      const ok = await confirm({
        title: "¿Eliminar venta?",
        description: "Esta acción no se puede deshacer.",
        confirmLabel: "Eliminar",
        variant: "danger",
        onConfirm: () =>
          deleteSale(sale.id, user?.id ?? null, profile?.full_name ?? null),
      });
      if (!ok) return;
      mutate();
      toast.success("Venta eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar la venta");
    }
  };

  const handleRegisterPayment = (sale: SaleWithProducts) => {
    setPaymentSale(sale);
    setIsPaymentModalOpen(true);
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

  const toggleDateGroup = (date: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const hasFilters = !!(startDate || endDate);

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <>
      <section className="h-full flex flex-col bg-slate-50">
        <PageHeader
          title="Ventas"
          subtitle={canSeeAllDates ? "Registra y consulta tus ventas" : "Ventas del día"}
          icon={<TrendingUp className="w-6 h-6 text-primary-700" />}
          action={
            <Button variant="primary" icon={true} onClick={handleCreate}>
              Registrar venta
            </Button>
          }
        />

        <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto">
          {canSeeAllDates && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Filtrar por fecha</h3>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Limpiar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  aria-label="Desde"
                />
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  aria-label="Hasta"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                Error al cargar las ventas: {error.message}
              </p>
            </div>
          )}

          {isLoading && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-base md:text-lg font-semibold text-slate-900">
                  Historial de Ventas
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>
          )}

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

              <SalesGroupedList
                groupedSales={groupedSales}
                expandedSaleId={expandedSaleId}
                collapsedDates={collapsedDates}
                isAdmin={isAdmin}
                canEditAnyDate={canEditAnyDate}
                canDeleteSales={canDeleteSales}
                currentUserId={user?.id ?? null}
                onToggleExpand={toggleExpand}
                onToggleDateGroup={toggleDateGroup}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRegisterPayment={handleRegisterPayment}
              />
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
        categories={categories}
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
          products={products}
          categories={categories}
        />
      )}
    </>
  );
}
