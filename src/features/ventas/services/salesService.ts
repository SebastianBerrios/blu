import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { getSaleNumber } from "@/utils/saleNumber";
import type { SaleSubmitParams } from "../types";
import {
  computeCommission,
  buildSalePayments,
  buildSaleProductRows,
  prepareSaleSubmit,
  type SalePayment,
} from "./salePayments";

// Builders kept public for existing importers (latePaymentService, feature barrel).
export { computeCommission, buildSalePayments };
export type { SalePayment };

export async function recordSaleTransactions(params: {
  saleId: number;
  saleNumber: number;
  paymentMethod: string | null;
  totalPrice: number;
  commission: number | null;
  cashAmount: number | null;
  plinAmount: number | null;
  cajaAccountId: number | null;
  bancoAccountId: number | null;
  rappiAccountId: number | null;
  posAccountId: number | null;
}): Promise<void> {
  const supabase = createClient();
  const payments = buildSalePayments(params);
  const { error } = await supabase.rpc("replace_sale_transactions", {
    p_sale_id: params.saleId,
    p_payments: payments,
  });
  if (error) throw error;
}

export async function createSale(params: SaleSubmitParams): Promise<void> {
  // Client-side UX pre-validation + payment entries (RPC recomputes server-side).
  const { discountAmount, paymentFields, commission, paymentEntries } =
    prepareSaleSubmit(params, 0); // saleNumber placeholder — RPC assigns the real id

  // --- Build the atomic payload ---
  const payload = {
    header: {
      order_type: params.orderType,
      table_number: params.orderType === "Mesa" ? parseInt(params.tableNumber) || null : null,
      notes: params.notes.trim() || null,
      customer_dni: params.customerDni || null,
      user_id: params.userId,
      total_price: params.totalPrice,
      discount_amount: discountAmount,
      register_payment: params.registerPayment,
    },
    products: buildSaleProductRows(0, params).map((row) => ({
      product_id: row.product_id,
      quantity: row.quantity,
      unit_price: row.unit_price,
      unit_cost: row.unit_cost,
      temperatura: row.temperatura,
      tipo_leche: row.tipo_leche,
      loyalty_reward: row.loyalty_reward,
      discount_amount: row.discount_amount,
    })),
    payment: {
      payment_method: paymentFields.payment_method,
      payment_date: paymentFields.payment_date,
      cash_amount: paymentFields.cash_amount,
      plin_amount: paymentFields.plin_amount,
      cash_received: paymentFields.cash_received,
    },
    payment_entries: paymentEntries,
    accounts: {
      caja_id: params.cajaAccountId,
      banco_id: params.bancoAccountId,
      rappi_id: params.rappiAccountId,
      pos_id: params.posAccountId,
    },
  };

  // --- Single atomic RPC call ---
  const supabase = createClient();
  const { data: saleId, error } = await supabase.rpc("create_sale_atomic", {
    p_payload: payload,
  });
  if (error) throw error;

  // --- Post-success side-effects (audit log + display number) ---
  const newSaleId = saleId as number;
  const saleNumber = await getSaleNumber(newSaleId);

  logAudit({
    userId: params.userId,
    userName: params.userName,
    action: "crear_venta",
    targetTable: "sales",
    targetId: newSaleId,
    targetDescription: `Venta #${saleNumber} - ${params.orderType} - S/ ${params.totalPrice.toFixed(2)}`,
    details: {
      tipo_pedido: params.orderType,
      total: params.totalPrice,
      productos: params.saleProducts.length,
      pago_registrado: params.registerPayment,
      cash_received: paymentFields.cash_received,
      commission,
    },
  });

  if (params.registerPayment) {
    logAudit({
      userId: params.userId,
      userName: params.userName,
      action: "crear_transaccion",
      targetTable: "transactions",
      targetDescription: `Venta #${saleNumber} - ${params.paymentMethod} - S/ ${params.totalPrice.toFixed(2)}`,
      details: {
        venta_id: newSaleId,
        metodo: params.paymentMethod,
        total: params.totalPrice,
        commission,
      },
    });
  }
}

export async function updateSale(
  saleId: number,
  params: SaleSubmitParams
): Promise<void> {
  const saleNumber = await getSaleNumber(saleId);
  const { discountAmount, paymentFields, commission, paymentEntries } =
    prepareSaleSubmit(params, saleNumber);

  // Derive kept_delivered_ids — IDs of Entregado sale_products the editor chose to keep.
  // The RPC uses this list to detect which Entregado rows to remove (admin-only sub-op).
  const keptDeliveredIds = params.saleProducts
    .filter((p) => p.status === "Entregado" && p.id != null)
    .map((p) => p.id as number);

  // Build pending product rows (Entregado items excluded — RPC handles them separately).
  const pendingProductRows = buildSaleProductRows(saleId, params).map((row) => ({
    product_id: row.product_id,
    quantity: row.quantity,
    unit_price: row.unit_price,
    unit_cost: row.unit_cost,
    temperatura: row.temperatura ?? null,
    tipo_leche: row.tipo_leche ?? null,
    loyalty_reward: row.loyalty_reward ?? null,
    discount_amount: row.discount_amount,
    status: "Pendiente" as const,
  }));

  // --- Assemble the atomic payload ---
  const payload = {
    header: {
      order_type: params.orderType,
      table_number: params.orderType === "Mesa" ? parseInt(params.tableNumber) || null : null,
      notes: params.notes.trim() || null,
      customer_dni: params.customerDni || null,
      total_price: params.totalPrice,
      discount_amount: discountAmount,
    },
    payment: {
      payment_method: paymentFields.payment_method,
      payment_date: paymentFields.payment_date,
      cash_amount: paymentFields.cash_amount,
      plin_amount: paymentFields.plin_amount,
      cash_received: paymentFields.cash_received,
    },
    products: pendingProductRows,
    kept_delivered_ids: keptDeliveredIds,
    payment_entries: paymentEntries,
  };

  // --- Single atomic RPC call ---
  const supabase = createClient();
  const { error } = await supabase.rpc("update_sale_atomic", {
    p_sale_id: saleId,
    p_payload: payload,
    p_user_id: params.userId ?? undefined,
  });
  if (error) throw error;

  // --- Post-success side-effects (audit log) ---
  logAudit({
    userId: params.userId,
    userName: params.userName,
    action: "actualizar",
    targetTable: "sales",
    targetId: saleId,
    targetDescription: paymentFields.payment_method
      ? `Venta #${saleNumber} - ${paymentFields.payment_method} - S/ ${params.totalPrice.toFixed(2)}`
      : `Venta #${saleNumber} - S/ ${params.totalPrice.toFixed(2)}`,
    details: {
      metodo_pago: paymentFields.payment_method,
      total: params.totalPrice,
      descuento: discountAmount,
      commission,
      productos: params.saleProducts.length,
    },
  });
}

export async function deleteSale(
  saleId: number,
  userId: string | null,
  userName: string | null
): Promise<void> {
  const saleNumber = await getSaleNumber(saleId);
  const supabase = createClient();
  const { data: sale } = await supabase
    .from("sales")
    .select("total_price")
    .eq("id", saleId)
    .single();

  const { error } = await supabase.rpc("delete_sale_atomic", {
    p_sale_id: saleId,
    p_user_name: userName ?? undefined,
  });
  if (error) throw error;

  logAudit({
    userId,
    userName,
    action: "eliminar",
    targetTable: "sales",
    targetId: saleId,
    targetDescription: `Venta #${saleNumber} - S/ ${sale?.total_price?.toFixed(2) ?? "?"}`,
  });
}
