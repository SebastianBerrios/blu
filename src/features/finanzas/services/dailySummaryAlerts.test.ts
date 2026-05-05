import { describe, it, expect } from "vitest";
import {
  generateCashChangeAlerts,
  generatePlinChangeAlerts,
  generateManualAdjustmentAlerts,
  generateSaleEditAlerts,
} from "./dailySummaryAlerts";

describe("generateCashChangeAlerts", () => {
  it("retorna alerta cuando cash_received > cash_amount", () => {
    const alerts = generateCashChangeAlerts([
      { id: 7, cash_amount: 50, cash_received: 100 },
    ]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      type: "cash_change",
      amount: 50,
      referenceId: 7,
      referenceType: "sale",
    });
    expect(alerts[0].id).toBe("cash-7");
  });

  it("ignora ventas donde cash_received === cash_amount", () => {
    const alerts = generateCashChangeAlerts([
      { id: 1, cash_amount: 30, cash_received: 30 },
    ]);
    expect(alerts).toEqual([]);
  });

  it("ignora ventas con cash_received null", () => {
    const alerts = generateCashChangeAlerts([
      { id: 2, cash_amount: 30, cash_received: null },
    ]);
    expect(alerts).toEqual([]);
  });

  it("ignora ventas con cash_amount null (Plin/Rappi)", () => {
    const alerts = generateCashChangeAlerts([
      { id: 3, cash_amount: null, cash_received: 50 },
    ]);
    expect(alerts).toEqual([]);
  });

  it("genera alertas para múltiples ventas con vuelto", () => {
    const alerts = generateCashChangeAlerts([
      { id: 1, cash_amount: 10, cash_received: 20 },
      { id: 2, cash_amount: 5, cash_received: 5 },
      { id: 3, cash_amount: 100, cash_received: 200 },
    ]);
    expect(alerts).toHaveLength(2);
    expect(alerts.map((a) => a.referenceId)).toEqual([1, 3]);
  });
});

describe("generatePlinChangeAlerts", () => {
  it("genera alerta cuando plin_change > 0", () => {
    const alerts = generatePlinChangeAlerts([
      { id: 5, plin_change: 12, total: 50 },
    ]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      type: "plin_change",
      amount: 12,
      referenceId: 5,
      referenceType: "purchase",
    });
  });

  it("ignora compras con plin_change null o 0", () => {
    expect(
      generatePlinChangeAlerts([
        { id: 1, plin_change: null, total: 50 },
        { id: 2, plin_change: 0, total: 50 },
      ]),
    ).toEqual([]);
  });
});

describe("generateManualAdjustmentAlerts", () => {
  it("alerta para gasto sin reference_id", () => {
    const alerts = generateManualAdjustmentAlerts([
      {
        id: 1,
        type: "gasto",
        reference_id: null,
        description: "Servicio luz",
        amount: -50,
      },
    ]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      type: "manual_adjustment",
      message: "Gasto manual sin referencia",
      detail: "Servicio luz",
      amount: 50,
    });
  });

  it("alerta para ingreso_extra sin reference_id", () => {
    const alerts = generateManualAdjustmentAlerts([
      {
        id: 2,
        type: "ingreso_extra",
        reference_id: null,
        description: null,
        amount: 30,
      },
    ]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toBe("Ingreso extra sin referencia");
  });

  it("ignora transactions con reference_id (vienen de venta o compra)", () => {
    expect(
      generateManualAdjustmentAlerts([
        {
          id: 3,
          type: "gasto",
          reference_id: 99,
          description: null,
          amount: -10,
        },
      ]),
    ).toEqual([]);
  });

  it("ignora otros tipos (ingreso_venta, transferencia, etc)", () => {
    expect(
      generateManualAdjustmentAlerts([
        {
          id: 4,
          type: "ingreso_venta",
          reference_id: null,
          description: null,
          amount: 20,
        },
        {
          id: 5,
          type: "transferencia_in",
          reference_id: null,
          description: null,
          amount: 100,
        },
      ]),
    ).toEqual([]);
  });
});

describe("generateSaleEditAlerts", () => {
  it("alerta cuando audit log tiene transacciones_regeneradas=true", () => {
    const alerts = generateSaleEditAlerts([
      {
        id: 1,
        action: "actualizar",
        target_id: "42",
        details: {
          transacciones_regeneradas: true,
          metodo_anterior: "Efectivo",
          metodo_nuevo: "Plin",
        },
      },
    ]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      type: "sale_edited",
      detail: "Efectivo → Plin",
      referenceId: 42,
    });
  });

  it("alerta sin detail cuando faltan los métodos", () => {
    const alerts = generateSaleEditAlerts([
      {
        id: 1,
        action: "actualizar",
        target_id: "9",
        details: { transacciones_regeneradas: true },
      },
    ]);
    expect(alerts[0].detail).toBeUndefined();
  });

  it("ignora actualizaciones sin transacciones_regeneradas", () => {
    expect(
      generateSaleEditAlerts([
        {
          id: 1,
          action: "actualizar",
          target_id: "1",
          details: {},
        },
      ]),
    ).toEqual([]);
  });

  it("alerta cuando hay 3+ cambios de estado de la misma venta", () => {
    const alerts = generateSaleEditAlerts([
      { id: 1, action: "cambiar_estado_pedido", target_id: "5", details: null },
      { id: 2, action: "cambiar_estado_pedido", target_id: "5", details: null },
      { id: 3, action: "cambiar_estado_pedido", target_id: "5", details: null },
    ]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      type: "sale_edited",
      detail: "Posible edición post-creación",
      referenceId: 5,
    });
  });

  it("NO alerta con menos de 3 cambios de estado", () => {
    const alerts = generateSaleEditAlerts([
      { id: 1, action: "cambiar_estado_pedido", target_id: "5", details: null },
      { id: 2, action: "cambiar_estado_pedido", target_id: "5", details: null },
    ]);
    expect(alerts).toEqual([]);
  });
});
