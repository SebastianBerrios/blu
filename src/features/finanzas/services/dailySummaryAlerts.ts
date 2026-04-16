// Pure alert generators — receive already-fetched data and return alerts.
// No Supabase access here.

export type DailyAlertType =
  | "cash_change"
  | "sale_edited"
  | "yape_change"
  | "manual_adjustment";

export interface DailyAlert {
  id: string;
  type: DailyAlertType;
  message: string;
  detail?: string;
  amount?: number;
  referenceId?: number;
  referenceType?: "sale" | "purchase" | "transaction";
}

interface SaleRow {
  id: number;
  cash_amount: number | null;
  cash_received: number | null;
}

interface PurchaseRow {
  id: number;
  yape_change: number | null;
  total: number;
}

interface TransactionRow {
  id: number;
  type: string;
  reference_id: number | null;
  description: string | null;
  amount: number;
}

interface AuditLogRow {
  id: number;
  action: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
}

export function generateCashChangeAlerts(sales: SaleRow[]): DailyAlert[] {
  const alerts: DailyAlert[] = [];
  for (const s of sales) {
    if (
      s.cash_received !== null &&
      s.cash_amount !== null &&
      Number(s.cash_received) > Number(s.cash_amount)
    ) {
      const change = Number(s.cash_received) - Number(s.cash_amount);
      alerts.push({
        id: `cash-${s.id}`,
        type: "cash_change",
        message: `Venta #${s.id} · vuelto entregado`,
        detail: `Recibido S/ ${Number(s.cash_received).toFixed(2)} · efectivo S/ ${Number(s.cash_amount).toFixed(2)}`,
        amount: change,
        referenceId: s.id,
        referenceType: "sale",
      });
    }
  }
  return alerts;
}

export function generateYapeChangeAlerts(purchases: PurchaseRow[]): DailyAlert[] {
  const alerts: DailyAlert[] = [];
  for (const p of purchases) {
    const amt = Number(p.yape_change ?? 0);
    if (amt > 0) {
      alerts.push({
        id: `yape-change-${p.id}`,
        type: "yape_change",
        message: `Compra #${p.id} · vuelto por Yape`,
        detail: `Total S/ ${Number(p.total).toFixed(2)}`,
        amount: amt,
        referenceId: p.id,
        referenceType: "purchase",
      });
    }
  }
  return alerts;
}

export function generateManualAdjustmentAlerts(
  transactions: TransactionRow[]
): DailyAlert[] {
  const alerts: DailyAlert[] = [];
  for (const t of transactions) {
    if (
      (t.type === "gasto" || t.type === "ingreso_extra") &&
      t.reference_id === null
    ) {
      alerts.push({
        id: `manual-${t.id}`,
        type: "manual_adjustment",
        message:
          t.type === "gasto"
            ? "Gasto manual sin referencia"
            : "Ingreso extra sin referencia",
        detail: t.description ?? undefined,
        amount: Math.abs(Number(t.amount)),
        referenceId: t.id,
        referenceType: "transaction",
      });
    }
  }
  return alerts;
}

export function generateSaleEditAlerts(auditLogs: AuditLogRow[]): DailyAlert[] {
  const alerts: DailyAlert[] = [];
  const cambiosPorSale: Record<string, number> = {};

  for (const log of auditLogs) {
    if (log.action === "actualizar" && log.target_id) {
      const details = (log.details ?? {}) as Record<string, unknown>;
      if (details.transacciones_regeneradas === true) {
        alerts.push({
          id: `sale-edit-${log.id}`,
          type: "sale_edited",
          message: `Venta #${log.target_id} editada · transacciones regeneradas`,
          detail:
            typeof details.metodo_anterior === "string" &&
            typeof details.metodo_nuevo === "string"
              ? `${details.metodo_anterior} → ${details.metodo_nuevo}`
              : undefined,
          referenceId: Number(log.target_id),
          referenceType: "sale",
        });
      }
    }
    if (log.action === "cambiar_estado_pedido" && log.target_id) {
      cambiosPorSale[log.target_id] = (cambiosPorSale[log.target_id] ?? 0) + 1;
    }
  }

  // Multiple status flips for the same sale on the same day can indicate rework
  for (const [targetId, count] of Object.entries(cambiosPorSale)) {
    if (count >= 3) {
      alerts.push({
        id: `sale-flips-${targetId}`,
        type: "sale_edited",
        message: `Venta #${targetId} · ${count} cambios de estado`,
        detail: "Posible edición post-creación",
        referenceId: Number(targetId),
        referenceType: "sale",
      });
    }
  }

  return alerts;
}
