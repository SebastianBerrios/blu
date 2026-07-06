/**
 * Formats a quantity number for display: strips trailing zeros up to 3 decimal
 * places. Example: 1.500 → "1.5", 0.003 → "0.003", 2 → "2".
 *
 * Used by ProduceForm and ProduccionTab (previously each had an inline copy).
 */
export function fmt(n: number): string {
  return Number(n.toFixed(3)).toString();
}
