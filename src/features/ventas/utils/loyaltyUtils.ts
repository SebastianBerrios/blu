import type { Product } from "@/types";
import type { LoyaltyReward, SaleProductLine } from "../types";

function rewardedPrice(
  originalPrice: number,
  reward: LoyaltyReward,
): number {
  if (reward === "50_postre") return originalPrice / 2;
  if (reward === "bebida_gratis") return 0;
  return originalPrice;
}

/**
 * Apply a loyalty reward to a cart line.
 * If the line has qty > 1, splits it into (qty-1) full-price + 1 rewarded line.
 * If qty === 1, modifies in place.
 */
export function applyLoyaltyReward(
  lines: SaleProductLine[],
  index: number,
  reward: LoyaltyReward,
): SaleProductLine[] {
  const line = lines[index];
  if (!line) return lines;

  const newUnitPrice = rewardedPrice(line.unit_price, reward);

  if (line.quantity === 1) {
    const updated: SaleProductLine = {
      ...line,
      unit_price: newUnitPrice,
      subtotal: newUnitPrice,
      loyalty_reward: reward,
    };
    return lines.map((l, i) => (i === index ? updated : l));
  }

  const remainingQty = line.quantity - 1;
  const full: SaleProductLine = {
    ...line,
    quantity: remainingQty,
    subtotal: remainingQty * line.unit_price,
    loyalty_reward: null,
  };
  const rewarded: SaleProductLine = {
    ...line,
    quantity: 1,
    unit_price: newUnitPrice,
    subtotal: newUnitPrice,
    loyalty_reward: reward,
  };

  const next = [...lines];
  next.splice(index, 1, full, rewarded);
  return next;
}

/**
 * Remove a loyalty reward from a line. Merges back into the matching full-price
 * line (same product + temperatura + tipo_leche, no reward). If no match exists,
 * creates a fresh full-price line using the original product price.
 */
export function removeLoyaltyReward(
  lines: SaleProductLine[],
  index: number,
  products: Product[],
): SaleProductLine[] {
  const target = lines[index];
  if (!target || !target.loyalty_reward) return lines;

  const product = products.find((p) => p.id === target.product_id);
  const originalPrice = product?.price ?? target.unit_price * 2;

  const matchIndex = lines.findIndex(
    (l, i) =>
      i !== index &&
      l.product_id === target.product_id &&
      l.temperatura === target.temperatura &&
      l.tipo_leche === target.tipo_leche &&
      !l.loyalty_reward,
  );

  if (matchIndex !== -1) {
    const match = lines[matchIndex];
    const newQty = match.quantity + 1;
    const merged: SaleProductLine = {
      ...match,
      quantity: newQty,
      subtotal: newQty * match.unit_price,
    };
    return lines
      .map((l, i) => (i === matchIndex ? merged : l))
      .filter((_, i) => i !== index);
  }

  const restored: SaleProductLine = {
    ...target,
    quantity: 1,
    unit_price: originalPrice,
    subtotal: originalPrice,
    loyalty_reward: null,
  };
  return lines.map((l, i) => (i === index ? restored : l));
}

/**
 * Returns indices of lines that can receive the given reward:
 * - line has no reward yet
 * - line's category_id has the matching tipo
 */
export function getEligibleIndices(
  lines: SaleProductLine[],
  reward: LoyaltyReward,
  categoryTipoById: Map<number, string | null>,
): number[] {
  const requiredTipo = reward === "50_postre" ? "postre" : "bebida";
  const result: number[] = [];
  lines.forEach((line, i) => {
    if (line.loyalty_reward) return;
    if (line.category_id == null) return;
    if (categoryTipoById.get(line.category_id) !== requiredTipo) return;
    result.push(i);
  });
  return result;
}
