import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { deleteWithAudit } from "@/utils/helpers/deleteWithAudit";
import { recordTransaction } from "@/hooks/useTransactions";
import { getPurchaseNumber } from "@/utils/purchaseNumber";
import type { PurchaseItemLine } from "@/types";
import type { CreatePurchaseParams, UpdatePurchaseParams } from "../types";

// --- Validation ---

export function validatePurchaseForm(params: {
  items: PurchaseItemLine[];
  hasDelivery: boolean;
  deliveryCost: string;
  selectedAccountId: number | null;
  hasPlinChange: boolean;
  plinChange: string;
  total: number;
  hasBancoAccount: boolean;
  isEditMode: boolean;
}): string | null {
  if (params.items.length === 0) {
    return "Agrega al menos un ítem";
  }

  if (params.hasDelivery) {
    const dc = parseFloat(params.deliveryCost);
    if (isNaN(dc) || dc <= 0) {
      return "Ingresa un costo de delivery válido";
    }
  }

  if (!params.selectedAccountId) {
    return "Selecciona una cuenta para la compra";
  }

  if (params.hasPlinChange && !params.isEditMode) {
    const plinAmount = parseFloat(params.plinChange) || 0;
    if (plinAmount <= 0) {
      return "Ingresa un monto válido para el vuelto por Plin";
    }
if (!params.hasBancoAccount) {
      return "No hay cuenta bancaria configurada para recibir el vuelto";
    }
  }

  return null;
}

// --- Mutations ---

function buildPurchaseItems(purchaseId: number, items: PurchaseItemLine[]) {
  return items.map((i) => ({
    purchase_id: purchaseId,
    item_name: i.item_name,
    ingredient_id: i.ingredient_id,
    price: i.price,
  }));
}

export async function createPurchase(params: CreatePurchaseParams): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const purchaseData = {
    user_id: user.id,
    has_delivery: params.hasDelivery,
    delivery_cost: params.hasDelivery ? params.deliveryCost : null,
    total: params.total,
    notes: params.notes.trim() || null,
    account_id: params.selectedAccountId,
    plin_change: params.plinChangeAmount > 0 ? params.plinChangeAmount : null,
  };

  const { data: newPurchase, error } = await supabase
    .from("purchases")
    .insert(purchaseData)
    .select()
    .single();
  if (error) throw error;

  const { error: itemsError } = await supabase
    .from("purchase_items")
    .insert(buildPurchaseItems(newPurchase.id, params.items));
  if (itemsError) throw itemsError;

  const purchaseNumber = await getPurchaseNumber(newPurchase.id);

  // Register financial transactions
  if (params.plinChangeAmount > 0) {
    await recordTransaction({
      accountId: params.cajaAccountId!,
      type: "egreso_compra",
      amount: -(params.total + params.plinChangeAmount),
      description: `Compra #${purchaseNumber} (incluye vuelto Plin S/ ${params.plinChangeAmount.toFixed(2)})`,
      referenceId: newPurchase.id,
      referenceType: "purchase",
    });
    await recordTransaction({
      accountId: params.bancoAccountId!,
      type: "ingreso_extra",
      amount: params.plinChangeAmount,
      description: `Vuelto Plin - Compra #${purchaseNumber}`,
      referenceId: newPurchase.id,
      referenceType: "purchase",
    });
    logAudit({
      userId: params.userId,
      userName: params.userName,
      action: "crear_transaccion",
      targetTable: "transactions",
      targetDescription: `Compra #${purchaseNumber} - S/ ${params.total.toFixed(2)} (Vuelto Plin S/ ${params.plinChangeAmount.toFixed(2)})`,
      details: { compra_id: newPurchase.id, total: params.total, vuelto_plin: params.plinChangeAmount },
    });
  } else {
    await recordTransaction({
      accountId: params.selectedAccountId,
      type: "egreso_compra",
      amount: -params.total,
      description: `Compra #${purchaseNumber}`,
      referenceId: newPurchase.id,
      referenceType: "purchase",
    });
    logAudit({
      userId: params.userId,
      userName: params.userName,
      action: "crear_transaccion",
      targetTable: "transactions",
      targetDescription: `Compra #${purchaseNumber} - S/ ${params.total.toFixed(2)}`,
      details: { compra_id: newPurchase.id, total: params.total },
    });
  }
}

export async function deletePurchase(
  purchaseId: number,
  userId: string | null,
  userName: string | null,
): Promise<void> {
  const purchaseNumber = await getPurchaseNumber(purchaseId);
  const supabase = createClient();
  const { data: purchase } = await supabase
    .from("purchases")
    .select("total")
    .eq("id", purchaseId)
    .single();

  await deleteWithAudit({
    table: "purchases",
    id: purchaseId,
    userId,
    userName,
    auditTable: "purchases",
    description: `Compra #${purchaseNumber} - S/ ${purchase?.total?.toFixed(2) ?? "?"}`,
  });
}

export async function updatePurchase(params: UpdatePurchaseParams): Promise<void> {
  const supabase = createClient();

  const purchaseData = {
    has_delivery: params.hasDelivery,
    delivery_cost: params.hasDelivery ? params.deliveryCost : null,
    total: params.total,
    notes: params.notes.trim() || null,
    account_id: params.selectedAccountId,
  };

  const { error } = await supabase
    .from("purchases")
    .update(purchaseData)
    .eq("id", params.purchaseId);
  if (error) throw error;

  await supabase.from("purchase_items").delete().eq("purchase_id", params.purchaseId);

  const { error: itemsError } = await supabase
    .from("purchase_items")
    .insert(buildPurchaseItems(params.purchaseId, params.items));
  if (itemsError) throw itemsError;
}
