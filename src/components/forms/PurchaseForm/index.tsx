"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, X, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { recordTransaction } from "@/hooks/useTransactions";
import { logAudit } from "@/utils/auditLog";
import type { Ingredient, PurchaseWithItems, PurchaseItemLine } from "@/types";

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
  const [items, setItems] = useState<PurchaseItemLine[]>([]);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  // Item entry fields
  const [searchText, setSearchText] = useState("");
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | null>(null);
  const [itemPrice, setItemPrice] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

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
      setSearchText("");
      setSelectedIngredientId(null);
      setItemPrice("");
      setShowDropdown(false);
    }
  }, [isOpen, purchase]);

  if (!isOpen) return null;

  const filteredIngredients = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelectIngredient = (id: number, name: string) => {
    setSelectedIngredientId(id);
    setSearchText(name);
    setShowDropdown(false);
  };

  const handleAddItem = () => {
    const trimmed = searchText.trim();
    if (!trimmed) {
      alert("Escribe el nombre del ítem");
      return;
    }
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price <= 0) {
      alert("Ingresa un precio válido");
      return;
    }

    setItems([
      ...items,
      {
        item_name: trimmed,
        ingredient_id: selectedIngredientId,
        price,
      },
    ]);
    setSearchText("");
    setSelectedIngredientId(null);
    setItemPrice("");
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      alert("Agrega al menos un ítem");
      return;
    }

    if (hasDelivery) {
      const dc = parseFloat(deliveryCost);
      if (isNaN(dc) || dc <= 0) {
        alert("Ingresa un costo de delivery válido");
        return;
      }
    }

    if (!selectedAccountId) {
      alert("Selecciona una cuenta para la compra");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const purchaseData = {
        has_delivery: hasDelivery,
        delivery_cost: hasDelivery ? deliveryCostNum : null,
        total,
        notes: notes.trim() || null,
        account_id: selectedAccountId,
      };

      if (isEditMode && purchase) {
        const { error } = await supabase
          .from("purchases")
          .update(purchaseData)
          .eq("id", purchase.id);

        if (error) throw error;

        await supabase.from("purchase_items").delete().eq("purchase_id", purchase.id);

        const { error: itemsError } = await supabase
          .from("purchase_items")
          .insert(
            items.map((i) => ({
              purchase_id: purchase.id,
              item_name: i.item_name,
              ingredient_id: i.ingredient_id,
              price: i.price,
            }))
          );

        if (itemsError) throw itemsError;
      } else {
        const { data: newPurchase, error } = await supabase
          .from("purchases")
          .insert({
            user_id: user.id,
            ...purchaseData,
          })
          .select()
          .single();

        if (error) throw error;

        const { error: itemsError } = await supabase
          .from("purchase_items")
          .insert(
            items.map((i) => ({
              purchase_id: newPurchase.id,
              item_name: i.item_name,
              ingredient_id: i.ingredient_id,
              price: i.price,
            }))
          );

        if (itemsError) throw itemsError;

        // Register financial transaction for new purchase
        await recordTransaction({
          accountId: selectedAccountId,
          type: "egreso_compra",
          amount: -total,
          description: `Compra #${newPurchase.id}`,
          referenceId: newPurchase.id,
          referenceType: "purchase",
        });

        logAudit({
          userId: authUser?.id ?? null,
          userName: profile?.full_name ?? null,
          action: "crear_transaccion",
          targetTable: "transactions",
          targetDescription: `Compra #${newPurchase.id} - S/ ${total.toFixed(2)}`,
          details: { compra_id: newPurchase.id, total },
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al guardar la compra:", error);
      alert("Ocurrió un error al guardar la compra");
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
                if (isAdmin) setSelectedAccountId(bancoAccount.id);
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

        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setSelectedIngredientId(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              placeholder="Nombre del ítem..."
            />

            {showDropdown &&
              searchText &&
              !selectedIngredientId &&
              filteredIngredients.length > 0 && (
                <ul className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredIngredients.map((ing) => (
                    <li
                      key={ing.id}
                      onClick={() =>
                        handleSelectIngredient(ing.id, ing.name)
                      }
                      className="px-4 py-3.5 hover:bg-primary-100 cursor-pointer transition-colors capitalize flex justify-between items-center"
                    >
                      <span>{ing.name}</span>
                      <span className="text-xs text-slate-500">
                        Ingrediente
                      </span>
                    </li>
                  ))}
                </ul>
              )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                S/
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
                placeholder="Precio"
              />
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              disabled={isSubmitting}
              className="px-6 py-3 bg-primary-900 text-white rounded-lg hover:bg-primary-800 disabled:bg-gray-400 transition-colors font-medium"
            >
              Agregar
            </button>
          </div>
        </div>

        {/* Lista de ítems agregados */}
        {items.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-slate-900 mb-2">
              Ítems en la compra ({items.length})
            </h3>

            {/* Mobile card list */}
            <div className="space-y-2 md:hidden">
              {items.map((item, index) => {
                const linkedIngredient = item.ingredient_id
                  ? ingredients.find((i) => i.id === item.ingredient_id)
                  : null;
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 capitalize truncate">{item.item_name}</p>
                      {linkedIngredient && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{linkedIngredient.name}</span>}
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <span className="text-sm font-semibold text-green-600">S/ {item.price.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={isSubmitting}
                        className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {/* Mobile subtotal */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg font-semibold">
                <span className="text-sm text-green-900">Subtotal ítems:</span>
                <span className="text-sm text-green-700">S/ {itemsTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 uppercase">
                      Nombre
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 uppercase">
                      Ingrediente
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-700 uppercase">
                      Precio
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-slate-700 uppercase">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, index) => {
                    const linkedIngredient = item.ingredient_id
                      ? ingredients.find((i) => i.id === item.ingredient_id)
                      : null;
                    return (
                      <tr
                        key={index}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-slate-900 capitalize">
                          {item.item_name}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {linkedIngredient ? (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                              {linkedIngredient.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900 text-right font-semibold">
                          <span className="text-green-600">
                            S/ {item.price.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            disabled={isSubmitting}
                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Eliminar ítem"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-green-50 font-semibold">
                    <td
                      colSpan={2}
                      className="px-4 py-3 text-sm text-right text-green-900"
                    >
                      Subtotal ítems:
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-700">
                      S/ {itemsTotal.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
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
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <span className="text-sm text-green-700">Total de la compra:</span>
          <span className="ml-2 font-bold text-green-800 text-lg">
            S/ {total.toFixed(2)}
          </span>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile fullscreen view */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
        {/* Header bar */}
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

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {formFields}
        </div>

        {/* Bottom bar */}
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

            {/* Botones de acción */}
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
