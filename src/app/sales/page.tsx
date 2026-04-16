"use client";

import { useState, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useSales, groupSalesByDate } from "@/hooks/useSales";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/hooks/useConfirm";
import { deleteSale } from "@/features/ventas";
import type { SaleWithProducts } from "@/types";
import SaleForm from "@/components/forms/SaleForm";
import PaymentModal from "@/components/forms/PaymentModal";
import SalesGroupedList from "@/features/ventas/components/SalesGroupedList";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import PageHeader from "@/components/ui/PageHeader";
import FAB from "@/components/ui/FAB";
import EmptyState from "@/components/ui/EmptyState";

export default function Sales() {
  const { isAdmin, user, profile } = useAuth();
  const confirm = useConfirm();
  const { sales, error, isLoading, mutate } = useSales({ todayOnly: !isAdmin });
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
    const ok = await confirm({
      title: "¿Eliminar venta?",
      description: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteSale(sale.id, user?.id ?? null, profile?.full_name ?? null);
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

              <SalesGroupedList
                groupedSales={groupedSales}
                expandedSaleId={expandedSaleId}
                collapsedDates={collapsedDates}
                isAdmin={isAdmin}
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
