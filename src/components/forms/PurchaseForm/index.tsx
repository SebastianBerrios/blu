"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import type { Ingredient, PurchaseWithItems, PurchaseItemLine } from "@/types";
import {
  validatePurchaseForm,
  createPurchase,
  updatePurchase,
} from "@/features/compras/services/purchasesService";
import ItemSelector from "@/features/compras/components/ItemSelector";
import ItemList from "@/features/compras/components/ItemList";

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
  const { isAdmin, user: authUser, profile } = useAuth();
  const { cajaAccount, bancoAccount } = useAccounts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [items, setItems] = useState<PurchaseItemLine[]>([]);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [hasYapeChange, setHasYapeChange] = useState(false);
  const [yapeChange, setYapeChange] = useState("");

  const itemsTotal = items.reduce((sum, i) => sum + i.price, 0);
  const deliveryCostNum = hasDelivery ? parseFloat(deliveryCost) || 0 : 0;
  const total = itemsTotal + deliveryCostNum;

  useEffect(() => {
    if (isOpen) {
      if (purchase) {
        setItems(
          purchase.purchase_items.map((pi) => ({
            item_name: pi.item_name,
            ingredient_id: pi.ingredient_id,
            price: pi.price,
          }))
        );
        setHasDelivery(purchase.has_delivery);
        setDeliveryCost(purchase.delivery_cost ? String(purchase.delivery_cost) : "");
        setNotes(purchase.notes ?? "");
        setSelectedAccountId(purchase.account_id ?? cajaAccount?.id ?? null);
      } else {
        setItems([]);
        setHasDelivery(false);
        setDeliveryCost("");
        setNotes("");
        setSelectedAccountId(cajaAccount?.id ?? null);
      }
      setHasYapeChange(false);
      setYapeChange("");
      setSubmitError(null);
    }
  }, [isOpen, purchase]);

  if (!isOpen) return null;

  const handleAddItem = (item: PurchaseItemLine) => {
    setItems([...items, item]);
    setSubmitError(null);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const yapeChangeAmount = hasYapeChange && !isEditMode ? parseFloat(yapeChange) || 0 : 0;

    const validationError = validatePurchaseForm({
      items,
      hasDelivery,
      deliveryCost,
      selectedAccountId,
      hasYapeChange,
      yapeChange,
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
        });
      } else {
        await createPurchase({
          items,
          hasDelivery,
          deliveryCost: deliveryCostNum,
          total,
          notes,
          selectedAccountId: selectedAccountId!,
          yapeChangeAmount,
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
      setSubmitError("Ocurrió un error al guardar la compra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formTitle = isEditMode ? "Editar Compra" : "Registrar Compra";

  const formFields = (
    <>
      {/* Cuenta de pago */}
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-2">
          Pagar desde <span className="text-red-600">*</span>
        </label>
        <div className="flex gap-2">
          {!cajaAccount && !bancoAccount && (
            <p className="text-sm text-red-600">
              No hay cuentas configuradas. Contacta al administrador.
            </p>
          )}
          {cajaAccount && (
            <button
              type="button"
              onClick={() => setSelectedAccountId(cajaAccount.id)}
              disabled={isSubmitting}
              className={`flex-1 px-4 py-3 min-h-[44px] rounded-lg border-2 font-medium transition-all ${
                selectedAccountId === cajaAccount.id
                  ? "bg-green-100 text-green-700 border-green-300"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Caja
            </button>
          )}
          {bancoAccount && (
            <button
              type="button"
              onClick={() => {
                if (isAdmin) {
                  setSelectedAccountId(bancoAccount.id);
                  setHasYapeChange(false);
                  setYapeChange("");
                }
              }}
              disabled={isSubmitting || !isAdmin}
              title={!isAdmin ? "Solo administradores pueden usar la cuenta bancaria" : undefined}
              className={`flex-1 px-4 py-3 min-h-[44px] rounded-lg border-2 font-medium transition-all ${
                selectedAccountId === bancoAccount.id
                  ? "bg-blue-100 text-blue-700 border-blue-300"
                  : !isAdmin
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Cuenta Bancaria
              {!isAdmin && <span className="block text-xs mt-0.5">Solo admin</span>}
            </button>
          )}
        </div>
      </div>

      {/* Agregar ítems */}
      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
        <label className="block text-sm font-medium text-slate-900 mb-1">
          Agregar ítems <span className="text-red-600">*</span>
        </label>
        <p className="text-xs text-slate-500 mb-3">
          Selecciona un ingrediente o escribe libremente
        </p>

        <ItemSelector
          ingredients={ingredients}
          onAdd={handleAddItem}
          isSubmitting={isSubmitting}
        />

        <ItemList
          items={items}
          ingredients={ingredients}
          onRemove={handleRemoveItem}
          subtotal={itemsTotal}
          isSubmitting={isSubmitting}
        />
      </div>

      {/* Delivery */}
      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasDelivery}
            onChange={(e) => setHasDelivery(e.target.checked)}
            disabled={isSubmitting}
            className="w-4 h-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-slate-900">
            Tiene delivery
          </span>
        </label>

        {hasDelivery && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Costo de delivery
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                S/
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={deliveryCost}
                onChange={(e) => setDeliveryCost(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                placeholder="0.00"
              />
            </div>
          </div>
        )}
      </div>

      {/* Vuelto por Yape (solo Caja, solo modo crear) */}
      {!isEditMode && cajaAccount && selectedAccountId === cajaAccount.id && (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasYapeChange}
              onChange={(e) => {
                setHasYapeChange(e.target.checked);
                if (!e.target.checked) setYapeChange("");
              }}
              disabled={isSubmitting}
              className="w-4 h-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-slate-900">
              Vuelto por Yape
            </span>
          </label>

          {hasYapeChange && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-900 mb-1.5">
                Monto del vuelto
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                  S/
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={yapeChange}
                  onChange={(e) => setYapeChange(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                El vuelto que el vendedor te devolvió por Yape (se registra en la Cuenta Bancaria)
              </p>
            </div>
          )}
        </div>
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
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          {hasYapeChange && !isEditMode && cajaAccount && selectedAccountId === cajaAccount.id && parseFloat(yapeChange) > 0 ? (
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Total compra:</span>
                <span className="font-medium">S/ {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-red-700">
                <span>Caja descuenta:</span>
                <span className="font-medium">S/ {(total + (parseFloat(yapeChange) || 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-blue-700">
                <span>Banco recibe (vuelto Yape):</span>
                <span className="font-medium">S/ {(parseFloat(yapeChange) || 0).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-sm text-green-700">Total de la compra:</span>
              <span className="ml-2 font-bold text-green-800 text-lg">
                S/ {total.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Inline error */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700 font-medium">{submitError}</p>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile fullscreen view */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900">
            {formTitle}
          </h2>
          <div className="w-11" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {formFields}
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || items.length === 0}
            className="w-full px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting
              ? "Guardando..."
              : isEditMode
              ? "Actualizar"
              : "Registrar compra"}
          </button>
        </div>
      </div>

      {/* Desktop modal view */}
      <div
        className="hidden md:flex fixed inset-0 bg-black/50 backdrop-blur-sm z-50 items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl sticky top-0 z-10">
            <h2 className="text-xl font-semibold text-slate-900">
              {formTitle}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {formFields}

            <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 min-h-[44px] border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || items.length === 0}
                className="flex-1 px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting
                  ? "Guardando..."
                  : isEditMode
                  ? "Actualizar"
                  : "Registrar compra"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
