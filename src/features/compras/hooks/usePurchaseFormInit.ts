import { useEffect } from "react";
import type { PurchaseWithItems, PurchaseItemLine } from "@/types";

interface PurchaseFormInitState {
  setItems: (v: PurchaseItemLine[]) => void;
  setHasDelivery: (v: boolean) => void;
  setDeliveryCost: (v: string) => void;
  setNotes: (v: string) => void;
  setSelectedAccountId: (v: number | null) => void;
  setHasPlinChange: (v: boolean) => void;
  setPlinChange: (v: string) => void;
  setSubmitError: (v: string | null) => void;
}

/**
 * Populates PurchaseForm state when the form opens (create or edit mode).
 * Keeps the init useEffect out of the form container to stay under the 300 LOC limit.
 *
 * Intentionally omits cajaAccount?.id from the dependency array: adding it would
 * re-run the init whenever the accounts hook resolves asynchronously (e.g. after the
 * form is already open and the user has started filling it in), resetting their input.
 * cajaAccount is stable once useAccounts() resolves, so reading it inside the effect
 * at open-time is correct — the value is what it is when the form opens.
 */
export function usePurchaseFormInit(
  isOpen: boolean,
  purchase: PurchaseWithItems | undefined,
  cajaAccountId: number | null | undefined,
  state: PurchaseFormInitState,
): void {
  const {
    setItems,
    setHasDelivery,
    setDeliveryCost,
    setNotes,
    setSelectedAccountId,
    setHasPlinChange,
    setPlinChange,
    setSubmitError,
  } = state;

  useEffect(() => {
    if (!isOpen) return;
    if (purchase) {
      setItems(
        purchase.purchase_items.map((pi) => ({
          item_name: pi.item_name,
          ingredient_id: pi.ingredient_id,
          price: pi.price,
          quantity: pi.quantity,
          unit: pi.unit,
        })),
      );
      setHasDelivery(purchase.has_delivery);
      setDeliveryCost(purchase.delivery_cost ? String(purchase.delivery_cost) : "");
      setNotes(purchase.notes ?? "");
      setSelectedAccountId(purchase.account_id ?? cajaAccountId ?? null);
      const existingPlin = Number(purchase.plin_change ?? 0);
      setHasPlinChange(existingPlin > 0);
      setPlinChange(existingPlin > 0 ? String(existingPlin) : "");
    } else {
      setItems([]);
      setHasDelivery(false);
      setDeliveryCost("");
      setNotes("");
      setSelectedAccountId(cajaAccountId ?? null);
      setHasPlinChange(false);
      setPlinChange("");
    }
    setSubmitError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, purchase]);
}
