import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
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
  hasYapeChange: boolean;
  yapeChange: string;
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

  if (params.hasYapeChange && !params.isEditMode) {
    const yapeAmount = parseFloat(params.yapeChange) || 0;
    if (yapeAmount <= 0) {
      return "Ingresa un monto válido para el vuelto por Yape";
    }
    if (yapeAmount >= params.total) {
      return "El vuelto no puede ser mayor o igual al total de la compra";
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
    yape_change: params.yapeChangeAmount > 0 ? params.yapeChangeAmount : null,
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
  if (params.yapeChangeAmount > 0) {
    await recordTransaction({
      accountId: params.cajaAccountId!,
      type: "egreso_compra",
      amount: -(params.total + params.yapeChangeAmount),
      description: `Compra #${purchaseNumber} (incluye vuelto Yape S/ ${params.yapeChangeAmount.toFixed(2)})`,
      referenceId: newPurchase.id,
      referenceType: "purchase",
    });
    await recordTransaction({
      accountId: params.bancoAccountId!,
      type: "ingreso_extra",
      amount: params.yapeChangeAmount,
      description: `Vuelto Yape - Compra #${purchaseNumber}`,
      referenceId: newPurchase.id,
      referenceType: "purchase",
    });
    logAudit({
      userId: params.userId,
      userName: params.userName,
      action: "crear_transaccion",
      targetTable: "transactions",
      targetDescription: `Compra #${purchaseNumber} - S/ ${params.total.toFixed(2)} (Vuelto Yape S/ ${params.yapeChangeAmount.toFixed(2)})`,
      details: { compra_id: newPurchase.id, total: params.total, vuelto_yape: params.yapeChangeAmount },
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
  const { error } = await supabase.from("purchases").delete().eq("id", purchaseId);
  if (error) throw new Error(`Error al eliminar compra: ${error.message}`);
  logAudit({
    userId,
    userName,
    action: "eliminar",
    targetTable: "purchases",
    targetId: purchaseId,
    targetDescription: `Compra #${purchaseNumber} - S/ ${purchase?.total?.toFixed(2) ?? "?"}`,
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
