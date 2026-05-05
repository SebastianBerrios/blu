import { describe, it, expect } from "vitest";
import { getSaleCommission, getSaleNet } from "./saleAmounts";

describe("getSaleCommission", () => {
  it("returns the stored commission when present and > 0", () => {
    expect(
      getSaleCommission({
        total_price: 100,
        commission: 25,
        payment_method: "Rappi",
        order_type: "Rappi",
      }),
    ).toBe(25);
  });

  it("returns 0 when no commission stored and not Rappi", () => {
    expect(
      getSaleCommission({
        total_price: 100,
        commission: null,
        payment_method: "Efectivo",
        order_type: "Mesa",
      }),
    ).toBe(0);
  });

  it("computes 20% commission when order_type is Rappi", () => {
    expect(
      getSaleCommission({
        total_price: 100,
        commission: null,
        payment_method: null,
        order_type: "Rappi",
      }),
    ).toBe(20);
  });

  it("computes 20% commission when payment_method is Rappi (even if order_type isn't)", () => {
    expect(
      getSaleCommission({
        total_price: 50,
        commission: null,
        payment_method: "Rappi",
        order_type: "Mesa",
      }),
    ).toBe(10);
  });

  it("treats commission=0 as missing (recomputes from rate)", () => {
    expect(
      getSaleCommission({
        total_price: 100,
        commission: 0,
        payment_method: "Rappi",
        order_type: "Rappi",
      }),
    ).toBe(20);
  });

  it("rounds the computed commission to 2 decimals", () => {
    expect(
      getSaleCommission({
        total_price: 33.33,
        commission: null,
        payment_method: null,
        order_type: "Rappi",
      }),
    ).toBe(6.67);
  });
});

describe("getSaleNet", () => {
  it("returns total minus stored commission", () => {
    expect(
      getSaleNet({
        total_price: 100,
        commission: 20,
        payment_method: "Rappi",
        order_type: "Rappi",
      }),
    ).toBe(80);
  });

  it("returns total when no commission applies", () => {
    expect(
      getSaleNet({
        total_price: 50,
        commission: null,
        payment_method: "Efectivo",
        order_type: "Mesa",
      }),
    ).toBe(50);
  });

  it("computes net for Rappi without stored commission", () => {
    expect(
      getSaleNet({
        total_price: 100,
        commission: null,
        payment_method: null,
        order_type: "Rappi",
      }),
    ).toBe(80);
  });

  it("rounds to 2 decimals", () => {
    expect(
      getSaleNet({
        total_price: 33.33,
        commission: null,
        payment_method: null,
        order_type: "Rappi",
      }),
    ).toBe(26.66);
  });
});
