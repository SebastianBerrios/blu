import { describe, it, expect } from "vitest";
import {
  bucketKey,
  aggregateBase,
  groupRevenueByBucket,
  aggregateTopProducts,
  aggregateRevenueVsExpenses,
  aggregateHeatmap,
  aggregateSalesByHour,
  computeDelta,
  toKPIValue,
} from "./statsAggregation";
import type { SaleRow, ExpenseRow } from "./statsAggregation";
import { hourInLima } from "@/utils/helpers/dateFormatters";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeSale(overrides: Partial<SaleRow> = {}): SaleRow {
  return {
    id: 1,
    sale_date: "2026-07-01T12:00:00.000Z",
    total_price: 100,
    discount_amount: null,
    commission: null,
    order_type: "Mesa",
    payment_method: "Efectivo",
    cash_amount: null,
    plin_amount: null,
    sale_products: [],
    ...overrides,
  };
}

function makeProduct(
  name: string,
  quantity: number,
  unit_price: number,
  discount_amount: number | null = null,
  unit_cost: number | null = null,
) {
  return {
    quantity,
    unit_price,
    unit_cost,
    discount_amount,
    products: { name },
  };
}

// ---------------------------------------------------------------------------
// Bug 1 — bucketKey Lima-aware TZ
// ---------------------------------------------------------------------------

describe("bucketKey — Lima-aware TZ", () => {
  // A sale at 23:30 Lima time = 04:30 UTC next day.
  // Browser in UTC would bucket it into the NEXT day / next month.
  // Lima-aware bucket must keep it in the Lima day/month.

  // 2026-07-31 23:30 Lima = 2026-08-01 04:30 UTC
  const midnightEdge = "2026-08-01T04:30:00.000Z";

  it('hour granularity: buckets by Lima hour, not UTC hour', () => {
    // Lima hour = 23:30 → hour 23
    // UTC hour = 4 (next day)
    expect(bucketKey(midnightEdge, "hour")).toContain("T23");
    expect(bucketKey(midnightEdge, "hour")).not.toContain("T04");
  });

  it('hour granularity: Lima date prefix matches Lima calendar day', () => {
    // Lima date should be 2026-07-31, not 2026-08-01
    const result = bucketKey(midnightEdge, "hour");
    expect(result.startsWith("2026-07-31T23")).toBe(true);
  });

  it('day granularity: Lima date key, not browser-local key', () => {
    // Day key should be 2026-07-31, not 2026-08-01
    expect(bucketKey(midnightEdge, "day")).toBe("2026-07-31");
  });

  it('month granularity: Lima month key, not browser-local month key', () => {
    // 2026-07-31 23:30 Lima → month key "2026-07"
    // UTC parse would give 2026-08-01 → month "2026-08"
    expect(bucketKey(midnightEdge, "month")).toBe("2026-07");
  });

  it('month granularity: a timestamp solidly mid-month returns the right key', () => {
    // 2026-06-15 10:00 Lima = 2026-06-15 15:00 UTC — no ambiguity
    expect(bucketKey("2026-06-15T15:00:00.000Z", "month")).toBe("2026-06");
  });

  it('salesByHour and bucketKey(hour) produce the SAME bucket for an edge-midnight sale', () => {
    // Both should use hourInLima. bucketKey wraps it; salesByHour also uses it.
    // Cross-check: bucketKey hour part equals hourInLima output.
    const h = hourInLima(midnightEdge);
    const bucket = bucketKey(midnightEdge, "hour");
    const bucketHour = parseInt(bucket.split("T")[1]);
    expect(bucketHour).toBe(h);
  });
});

// ---------------------------------------------------------------------------
// Bug 2 — Top-products net-of-commission
// ---------------------------------------------------------------------------

describe("aggregateTopProducts — net-of-commission basis", () => {
  // A Rappi sale: total_price=100, commission=20 → net=80.
  // Two products: A qty=1 unit_price=60, B qty=1 unit_price=40.
  // Gross line totals: A=60, B=40. Total gross=100.
  // Commission rate applied proportionally: A gets 60/100 * 20 = 12 deducted → net 48.
  // B gets 40/100 * 20 = 8 deducted → net 32.
  // Sum of net per product = 48+32 = 80 = getSaleNet(sale).

  const rappiSale = makeSale({
    total_price: 100,
    commission: 20,
    order_type: "Rappi",
    payment_method: "Rappi",
    sale_products: [
      makeProduct("Café", 1, 60),
      makeProduct("Brownie", 1, 40),
    ],
  });

  it('top-product revenue sums reconcile with the Revenue KPI (getSaleNet)', () => {
    const products = aggregateTopProducts([rappiSale]);
    const totalProductRevenue = products.reduce((s, p) => s + p.totalRevenue, 0);
    // getSaleNet(rappiSale) = 100 - 20 = 80
    expect(totalProductRevenue).toBeCloseTo(80, 5);
  });

  it('top-product revenue for a non-commission sale equals gross line total', () => {
    const normalSale = makeSale({
      total_price: 100,
      commission: null,
      order_type: "Mesa",
      payment_method: "Efectivo",
      sale_products: [
        makeProduct("Café", 2, 30),   // gross = 60
        makeProduct("Brownie", 1, 40), // gross = 40
      ],
    });
    const products = aggregateTopProducts([normalSale]);
    const cafe = products.find((p) => p.productName === "Café")!;
    const brownie = products.find((p) => p.productName === "Brownie")!;
    expect(cafe.totalRevenue).toBeCloseTo(60, 5);
    expect(brownie.totalRevenue).toBeCloseTo(40, 5);
  });

  it('top-product revenue for a POS sale is net of POS commission (proportional)', () => {
    // POS: 3.44% on total_price=100 → commission=3.44 → net=96.56
    const posSale = makeSale({
      total_price: 100,
      commission: null,
      order_type: "Mesa",
      payment_method: "POS",
      sale_products: [
        makeProduct("Café", 1, 100),
      ],
    });
    const products = aggregateTopProducts([posSale]);
    const total = products.reduce((s, p) => s + p.totalRevenue, 0);
    // getSaleNet = 96.56
    expect(total).toBeCloseTo(96.56, 1);
  });

  it('aggregates across multiple sales correctly', () => {
    const sale2 = makeSale({
      total_price: 50,
      commission: null,
      order_type: "Mesa",
      payment_method: "Efectivo",
      sale_products: [makeProduct("Café", 1, 50)],
    });
    const products = aggregateTopProducts([rappiSale, sale2]);
    const totalRevenue = products.reduce((s, p) => s + p.totalRevenue, 0);
    // getSaleNet(rappiSale)=80, getSaleNet(sale2)=50 → 130
    expect(totalRevenue).toBeCloseTo(130, 5);
  });

  it('handles a sale with line-level discount correctly', () => {
    const saleWithDiscount = makeSale({
      total_price: 90, // 100 - 10 discount
      discount_amount: 10,
      commission: null,
      order_type: "Mesa",
      payment_method: "Efectivo",
      sale_products: [
        makeProduct("Café", 1, 60, 5),  // line discount 5 → line gross 55
        makeProduct("Brownie", 1, 40, 5), // line discount 5 → line gross 35
      ],
    });
    const products = aggregateTopProducts([saleWithDiscount]);
    // No commission on this sale → net = total_price - discount_amount = 90
    // getSaleNet = discountedSubtotal - 0 = 90
    const total = products.reduce((s, p) => s + p.totalRevenue, 0);
    expect(total).toBeCloseTo(90, 5);
  });
});

// ---------------------------------------------------------------------------
// Bug 3 — revenueVsExpenses Lima date keys
// ---------------------------------------------------------------------------

describe("aggregateRevenueVsExpenses — Lima date keys", () => {
  // Sale at Lima 2026-07-31 23:45 = UTC 2026-08-01 04:45
  // Expense created_at = UTC 2026-08-01 01:00 → Lima 2026-07-31 20:00

  const limaMidnightSale = makeSale({
    sale_date: "2026-08-01T04:45:00.000Z", // Lima: 2026-07-31
    total_price: 50,
    commission: null,
    payment_method: "Efectivo",
    order_type: "Mesa",
    sale_products: [],
  });

  const sameLinaExpense: ExpenseRow = {
    amount: -30,
    type: "gasto",
    created_at: "2026-08-01T01:00:00.000Z", // Lima: 2026-07-31 20:00
  };

  it('sale and expense on the same Lima day share a key, even if their UTC timestamps differ', () => {
    const rows = aggregateRevenueVsExpenses([limaMidnightSale], [sameLinaExpense]);
    expect(rows).toHaveLength(1); // one combined day
    const row = rows[0];
    expect(row.date).toBe("2026-07-31");
    expect(row.revenue).toBeCloseTo(50, 5);
    expect(row.expenses).toBeCloseTo(30, 5);
  });

  it('returns separate rows when dates differ in Lima TZ', () => {
    const nextDayExpense: ExpenseRow = {
      amount: -10,
      type: "gasto",
      created_at: "2026-08-01T10:00:00.000Z", // Lima: 2026-08-01 05:00
    };
    const rows = aggregateRevenueVsExpenses([limaMidnightSale], [sameLinaExpense, nextDayExpense]);
    expect(rows).toHaveLength(2);
    const dates = rows.map((r) => r.date).sort();
    expect(dates).toEqual(["2026-07-31", "2026-08-01"]);
  });

  it('revenue-only day (no expense) appears with expenses=0', () => {
    const rows = aggregateRevenueVsExpenses([limaMidnightSale], []);
    expect(rows).toHaveLength(1);
    expect(rows[0].expenses).toBe(0);
    expect(rows[0].revenue).toBeCloseTo(50, 5);
  });

  it('expense-only day (no sale) appears with revenue=0', () => {
    const rows = aggregateRevenueVsExpenses([], [sameLinaExpense]);
    expect(rows).toHaveLength(1);
    expect(rows[0].revenue).toBe(0);
    expect(rows[0].expenses).toBeCloseTo(30, 5);
  });
});

// ---------------------------------------------------------------------------
// Basic aggregation sanity (lock current-correct behavior)
// ---------------------------------------------------------------------------

describe("aggregateBase — KPI aggregation sanity", () => {
  it('sums net revenue via getSaleNet', () => {
    const sales = [
      makeSale({ total_price: 100, commission: null, payment_method: "Efectivo", order_type: "Mesa" }),
      makeSale({ total_price: 50, commission: 10, payment_method: "Rappi", order_type: "Rappi" }),
    ];
    const result = aggregateBase(sales);
    // sale1 net = 100, sale2 net = 40
    expect(result.revenue).toBeCloseTo(140, 5);
    expect(result.totalSales).toBe(2);
  });

  it('counts productsSold and grossCost from sale_products', () => {
    const sale = makeSale({
      total_price: 100,
      commission: null,
      payment_method: "Efectivo",
      order_type: "Mesa",
      sale_products: [
        makeProduct("Café", 2, 30, null, 10),   // qty=2 cost=10 → grossCost 20
        makeProduct("Brownie", 1, 40, null, 15), // qty=1 cost=15 → grossCost 15
      ],
    });
    const result = aggregateBase([sale]);
    expect(result.productsSold).toBe(3);
    expect(result.grossCost).toBeCloseTo(35, 5);
  });
});

describe("computeDelta", () => {
  it('returns null when previous=0 and current>0', () => {
    expect(computeDelta(10, 0)).toBeNull();
  });

  it('returns 0 when both are 0', () => {
    expect(computeDelta(0, 0)).toBe(0);
  });

  it('computes correct delta %', () => {
    expect(computeDelta(150, 100)).toBeCloseTo(50, 5);
    expect(computeDelta(50, 100)).toBeCloseTo(-50, 5);
  });
});

describe("groupRevenueByBucket — Lima-consistent hour buckets", () => {
  // Two sales on the same Lima day in different UTC days.
  const sale1 = makeSale({
    sale_date: "2026-08-01T04:30:00.000Z", // Lima 2026-07-31 23:30
    total_price: 40,
    payment_method: "Efectivo",
    order_type: "Mesa",
  });
  const sale2 = makeSale({
    sale_date: "2026-08-01T04:00:00.000Z", // Lima 2026-07-31 23:00
    total_price: 60,
    payment_method: "Efectivo",
    order_type: "Mesa",
  });

  it('groups two sales in the same Lima hour bucket', () => {
    // Both are 23:xx Lima → both should land in bucket ending with T23
    const buckets = groupRevenueByBucket([sale1, sale2], "hour");
    // There should be one or two buckets; both must be Lima-day based
    for (const b of buckets) {
      expect(b.date.startsWith("2026-07-31")).toBe(true);
    }
  });

  it('day granularity: both sales land on same Lima day', () => {
    const buckets = groupRevenueByBucket([sale1, sale2], "day");
    expect(buckets).toHaveLength(1);
    expect(buckets[0].date).toBe("2026-07-31");
    expect(buckets[0].revenue).toBeCloseTo(100, 5);
  });

  it('month granularity: both sales land on Lima month 2026-07', () => {
    const buckets = groupRevenueByBucket([sale1, sale2], "month");
    expect(buckets).toHaveLength(1);
    expect(buckets[0].date).toBe("2026-07");
  });
});

describe("aggregateHeatmap and aggregateSalesByHour — Lima hour/day", () => {
  // Sale at Lima 2026-07-31 23:45 = UTC 2026-08-01 04:45
  // Lima day-of-week for 2026-07-31: Friday = day 4 (0=Mon)
  const sale = makeSale({
    sale_date: "2026-08-01T04:45:00.000Z",
    total_price: 100,
    commission: null,
    payment_method: "Efectivo",
    order_type: "Mesa",
  });

  it('salesByHour uses Lima hour 23, not UTC hour 4', () => {
    const byHour = aggregateSalesByHour([sale]);
    expect(byHour.some((h) => h.hour === 23)).toBe(true);
    expect(byHour.some((h) => h.hour === 4)).toBe(false);
  });

  it('heatmap uses Lima dow and Lima hour', () => {
    const cells = aggregateHeatmap([sale]);
    expect(cells).toHaveLength(1);
    expect(cells[0].hour).toBe(23);
    // 2026-07-31 is a Friday. 0=Mon…6=Sun → Friday=4
    expect(cells[0].dayOfWeek).toBe(4);
  });
});

describe("toKPIValue", () => {
  it('wraps current, previous, and deltaPct correctly', () => {
    const result = toKPIValue(150, 100);
    expect(result.current).toBe(150);
    expect(result.previous).toBe(100);
    expect(result.deltaPct).toBeCloseTo(50, 5);
  });
});
