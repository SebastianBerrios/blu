"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { usePaymentAccounts } from "@/hooks/usePaymentAccounts";
import type { Ingredient, PurchaseWithItems, PurchaseItemLine } from "@/types";
import {
  validatePurchaseForm,
  createPurchase,
  updatePurchase,
} from "@/features/compras/services/purchasesService";
import AccountSelector from "@/features/compras/components/AccountSelector";
import DeliverySection from "@/features/compras/components/DeliverySection";
import PlinChangeSection from "@/features/compras/components/PlinChangeSection";
import PurchaseTotalDisplay from "@/features/compras/components/PurchaseTotalDisplay";
import PurchaseFormShell from "@/features/compras/components/PurchaseFormShell";
import PurchaseItemsSection from "@/features/compras/components/PurchaseItemsSection";
import { usePurchaseFormInit } from "@/features/compras/hooks/usePurchaseFormInit";

interface PurchaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchase?: PurchaseWithItems;
  ingredients: Ingredient[];
}

export default function PurchaseForm({
  isOpen,
  onClose,
  onSuccess,
  purchase,
  ingredients,
}: PurchaseFormProps) {
  const isEditMode = !!purchase;
  const { user: authUser, profile } = useAuth();
  const { can } = usePermissions();
  const { cajaAccount, bancoAccount } = usePaymentAccounts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [items, setItems] = useState<PurchaseItemLine[]>([]);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [hasPlinChange, setHasPlinChange] = useState(false);
  const [plinChange, setPlinChange] = useState("");

  usePurchaseFormInit(isOpen, purchase, cajaAccount?.id, {
    setItems,
    setHasDelivery,
    setDeliveryCost,
    setNotes,
    setSelectedAccountId,
    setHasPlinChange,
    setPlinChange,
    setSubmitError,
  });

  if (!isOpen) return null;

  const itemsTotal = items.reduce((sum, i) => sum + i.price, 0);
  const deliveryCostNum = hasDelivery ? parseFloat(deliveryCost) || 0 : 0;
  const total = itemsTotal + deliveryCostNum;

  const handleAddItem = (item: PurchaseItemLine) => {
    setItems([...items, item]);
    setSubmitError(null);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const plinChangeAmount = hasPlinChange ? parseFloat(plinChange) || 0 : 0;

    const validationError = validatePurchaseForm({
      items,
      hasDelivery,
      deliveryCost,
      selectedAccountId,
      hasPlinChange,
      plinChange,
      total,
      hasBancoAccount: !!bancoAccount,
      isEditMode,
    });

    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (isEditMode && purchase) {
        await updatePurchase({
          purchaseId: purchase.id,
          items,
          hasDelivery,
          deliveryCost: deliveryCostNum,
          total,
          notes,
          selectedAccountId: selectedAccountId!,
          plinChangeAmount,
          cajaAccountId: cajaAccount?.id ?? null,
          bancoAccountId: bancoAccount?.id ?? null,
          userId: authUser?.id ?? null,
          userName: profile?.full_name ?? null,
        });
      } else {
        await createPurchase({
          items,
          hasDelivery,
          deliveryCost: deliveryCostNum,
          total,
          notes,
          selectedAccountId: selectedAccountId!,
          plinChangeAmount,
          cajaAccountId: cajaAccount?.id ?? null,
          bancoAccountId: bancoAccount?.id ?? null,
          userId: authUser?.id ?? null,
          userName: profile?.full_name ?? null,
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al guardar la compra:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Ocurrió un error al guardar la compra",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formTitle = isEditMode ? "Editar Compra" : "Registrar Compra";
  const submitLabel = isSubmitting ? "Guardando..." : isEditMode ? "Actualizar" : "Registrar compra";

  return (
    <PurchaseFormShell
      title={formTitle}
      onClose={onClose}
      isSubmitting={isSubmitting}
      submitDisabled={isSubmitting || items.length === 0}
      submitLabel={submitLabel}
      onSubmit={handleSubmit}
    >
      <AccountSelector
        cajaAccount={cajaAccount}
        bancoAccount={bancoAccount}
        selectedAccountId={selectedAccountId}
        onSelect={setSelectedAccountId}
        onSelectBanco={(id) => {
          setSelectedAccountId(id);
          setHasPlinChange(false);
          setPlinChange("");
        }}
        canUseBanco={can("action.purchases.use_banco")}
        isSubmitting={isSubmitting}
      />

      <PurchaseItemsSection
        items={items}
        ingredients={ingredients}
        onAdd={handleAddItem}
        onRemove={handleRemoveItem}
        subtotal={itemsTotal}
        isSubmitting={isSubmitting}
      />

      <DeliverySection
        hasDelivery={hasDelivery}
        deliveryCost={deliveryCost}
        onToggleDelivery={setHasDelivery}
        onChangeCost={setDeliveryCost}
        isSubmitting={isSubmitting}
      />

      {/* Vuelto por Plin (solo Caja) */}
      {cajaAccount && selectedAccountId === cajaAccount.id && (
        <PlinChangeSection
          hasPlinChange={hasPlinChange}
          plinChange={plinChange}
          onToggle={setHasPlinChange}
          onChange={setPlinChange}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          Notas <span className="text-slate-500 text-xs">(opcional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
          rows={2}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100 resize-none"
          placeholder="Observaciones sobre la compra..."
        />
      </div>

      {/* Total */}
      {items.length > 0 && (
        <PurchaseTotalDisplay
          total={total}
          plinChange={plinChange}
          showPlinBreakdown={
            hasPlinChange &&
            !!cajaAccount &&
            selectedAccountId === cajaAccount.id
          }
        />
      )}

      {/* Inline error */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700 font-medium">{submitError}</p>
        </div>
      )}
    </PurchaseFormShell>
  );
}
