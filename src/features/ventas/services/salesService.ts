import { createClient } from "@/utils/supabase/client";
import { recordTransaction } from "@/hooks/useTransactions";
import { logAudit } from "@/utils/auditLog";
import { getSaleNumber } from "@/utils/saleNumber";
import type { SaleSubmitParams } from "../types";

async function resolveCustomerId(dni: string): Promise<number | null> {
  if (!dni.trim()) return null;

  const supabase = createClient();
  const dniNumber = parseInt(dni.trim());

  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("dni", dniNumber)
    .single();

  if (existing) return existing.id;

  const { data: newCustomer, error } = await supabase
    .from("customers")
    .insert({ dni: dniNumber })
    .select("id")
    .single();

  if (error) throw error;
  return newCustomer.id;
}

function buildPaymentFields(params: SaleSubmitParams) {
  if (!params.registerPayment) {
    return {
      payment_method: null,
      payment_date: null,
      cash_amount: null,
      yape_amount: null,
    };
  }

  return {
    payment_method: params.paymentMethod,
    payment_date: params.existingPaymentDate ?? new Date().toISOString(),
    cash_amount:
      params.paymentMethod === "Efectivo"
        ? params.totalPrice
        : params.paymentMethod === "Efectivo + Yape"
          ? parseFloat(params.cashAmount)
          : null,
    yape_amount:
      params.paymentMethod === "Yape"
        ? params.totalPrice
        : params.paymentMethod === "Efectivo + Yape"
          ? parseFloat(params.yapeAmount)
          : null,
  };
}

function validateSplitPayment(params: SaleSubmitParams): void {
  if (!params.registerPayment || params.paymentMethod !== "Efectivo + Yape")
    return;

  const cash = parseFloat(params.cashAmount);
  const yape = parseFloat(params.yapeAmount);

  if (isNaN(cash) || isNaN(yape) || cash < 0 || yape < 0) {
    throw new Error("Ingresa montos válidos");
  }
  if (Math.abs(cash + yape - params.totalPrice) > 0.01) {
    throw new Error("Los montos deben sumar el total de la venta");
  }
}

function buildSaleProductRows(
  saleId: number,
  params: SaleSubmitParams,
) {
  return params.saleProducts.map((p) => ({
    sale_id: saleId,
    product_id: p.product_id,
    quantity: p.quantity,
    unit_price: p.unit_price,
    temperatura: p.temperatura,
    tipo_leche: p.tipo_leche,
  }));
}

export async function createSale(params: SaleSubmitParams): Promise<void> {
  validateSplitPayment(params);

  const supabase = createClient();
  const customerId = await resolveCustomerId(params.customerDni);
  const paymentFields = buildPaymentFields(params);

  const { data: newSale, error } = await supabase
    .from("sales")
    .insert({
      order_type: params.orderType,
      total_price: params.totalPrice,
      customer_id: customerId,
      table_number:
        params.orderType === "Mesa"
          ? parseInt(params.tableNumber) || null
          : null,
      user_id: params.userId,
      ...paymentFields,
    })
    .select()
    .single();

  if (error) throw error;

  const { error: productsError } = await supabase
    .from("sale_products")
    .insert(buildSaleProductRows(newSale.id, params));

  if (productsError) throw productsError;

  const saleNumber = await getSaleNumber(newSale.id);

  logAudit({
    userId: params.userId,
    userName: params.userName,
    action: "crear_venta",
    targetTable: "sales",
    targetId: newSale.id,
    targetDescription: `Venta #${saleNumber} - ${params.orderType} - S/ ${params.totalPrice.toFixed(2)}`,
    details: {
      tipo_pedido: params.orderType,
      total: params.totalPrice,
      productos: params.saleProducts.length,
      pago_registrado: params.registerPayment,
    },
  });

  if (params.registerPayment) {
    const cashAmt = paymentFields.cash_amount;
    const yapeAmt = paymentFields.yape_amount;

    if (cashAmt && cashAmt > 0 && params.cajaAccountId) {
      await recordTransaction({
        accountId: params.cajaAccountId,
        type: "ingreso_venta",
        amount: cashAmt,
        description: `Venta #${saleNumber} - Efectivo`,
        referenceId: newSale.id,
        referenceType: "sale",
      });
    }
    if (yapeAmt && yapeAmt > 0 && params.bancoAccountId) {
      await recordTransaction({
        accountId: params.bancoAccountId,
        type: "ingreso_venta",
        amount: yapeAmt,
        description: `Venta #${saleNumber} - Yape`,
        referenceId: newSale.id,
        referenceType: "sale",
      });
    }

    logAudit({
      userId: params.userId,
      userName: params.userName,
      action: "crear_transaccion",
      targetTable: "transactions",
      targetDescription: `Venta #${saleNumber} - ${params.paymentMethod} - S/ ${params.totalPrice.toFixed(2)}`,
      details: {
        venta_id: newSale.id,
        metodo: params.paymentMethod,
        total: params.totalPrice,
      },
    });
  }
}

export async function deleteSale(
  saleId: number,
  userId: string | null,
  userName: string | null,
): Promise<void> {
  const saleNumber = await getSaleNumber(saleId);
  const supabase = createClient();
  const { data: sale } = await supabase
    .from("sales")
    .select("total_price")
    .eq("id", saleId)
    .single();
  const { error } = await supabase.from("sales").delete().eq("id", saleId);
  if (error) throw new Error(`Error al eliminar venta: ${error.message}`);
  logAudit({
    userId,
    userName,
    action: "eliminar",
    targetTable: "sales",
    targetId: saleId,
    targetDescription: `Venta #${saleNumber} - S/ ${sale?.total_price?.toFixed(2) ?? "?"}`,
  });
}

export async function updateSale(
  saleId: number,
  params: SaleSubmitParams,
): Promise<void> {
  validateSplitPayment(params);

  const supabase = createClient();
  const customerId = await resolveCustomerId(params.customerDni);
  const paymentFields = buildPaymentFields(params);

  const { error } = await supabase
    .from("sales")
    .update({
      order_type: params.orderType,
      total_price: params.totalPrice,
      customer_id: customerId,
      table_number:
        params.orderType === "Mesa"
          ? parseInt(params.tableNumber) || null
          : null,
      ...paymentFields,
    })
    .eq("id", saleId);

  if (error) throw error;

  await supabase.from("sale_products").delete().eq("sale_id", saleId);

  const { error: productsError } = await supabase
    .from("sale_products")
    .insert(buildSaleProductRows(saleId, params));

  if (productsError) throw productsError;
}
