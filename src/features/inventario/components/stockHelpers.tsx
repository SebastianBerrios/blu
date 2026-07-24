const LOW_STOCK_THRESHOLD = 0.1;

export const StockColGroup = ({ showGroup }: { showGroup: boolean }) => (
  <colgroup>
    <col />
    <col style={{ width: "140px" }} />
    <col style={{ width: "100px" }} />
    {showGroup && <col style={{ width: "200px" }} />}
    <col style={{ width: "140px" }} />
  </colgroup>
);

export function getStockColor(quantity: number, unit: string) {
  const thresholds: Record<string, number> = {
    kg: 0.5,
    g: 200,
    l: 0.5,
    ml: 200,
    und: 5,
    unidad: 5,
  };
  const threshold = thresholds[unit.toLowerCase()] ?? LOW_STOCK_THRESHOLD;
  if (quantity <= 0) return "text-red-600 bg-red-50 border-red-200";
  if (quantity <= threshold) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-emerald-600 bg-emerald-50 border-emerald-200";
}
