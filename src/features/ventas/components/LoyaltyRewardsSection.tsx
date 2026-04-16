import { useMemo, useState } from "react";
import { Award, ChevronDown, ChevronUp, X } from "lucide-react";
import type { Category } from "@/types";
import type { LoyaltyReward, SaleProductLine } from "../types";
import { getEligibleIndices } from "../utils/loyaltyUtils";

interface LoyaltyRewardsSectionProps {
  saleProducts: SaleProductLine[];
  categories: Category[];
  onApplyReward: (index: number, reward: LoyaltyReward) => void;
  onRemoveReward: (index: number) => void;
  isSubmitting: boolean;
}

const REWARDS: {
  key: LoyaltyReward;
  title: string;
  badge: string;
  badgeColor: string;
}[] = [
  {
    key: "50_postre",
    title: "50% en un postre",
    badge: "50% desc.",
    badgeColor: "bg-green-100 text-green-700",
  },
  {
    key: "bebida_gratis",
    title: "Bebida gratis",
    badge: "Gratis",
    badgeColor: "bg-green-100 text-green-700",
  },
];

export default function LoyaltyRewardsSection({
  saleProducts,
  categories,
  onApplyReward,
  onRemoveReward,
  isSubmitting,
}: LoyaltyRewardsSectionProps) {
  const [openReward, setOpenReward] = useState<LoyaltyReward | null>(null);

  const categoryTipoById = useMemo(() => {
    const map = new Map<number, string | null>();
    categories.forEach((c) => map.set(c.id, c.tipo));
    return map;
  }, [categories]);

  if (saleProducts.length === 0) return null;

  const anyEligible = REWARDS.some(
    (r) =>
      getEligibleIndices(saleProducts, r.key, categoryTipoById).length > 0 ||
      saleProducts.some((l) => l.loyalty_reward === r.key),
  );

  if (!anyEligible) return null;

  const toggle = (key: LoyaltyReward) =>
    setOpenReward((prev) => (prev === key ? null : key));

  return (
    <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/50">
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-5 h-5 text-amber-700" />
        <span className="text-sm font-semibold text-slate-900">
          Promociones de fidelidad
        </span>
      </div>

      <div className="space-y-2">
        {REWARDS.map((r) => {
          const eligibleIdx = getEligibleIndices(
            saleProducts,
            r.key,
            categoryTipoById,
          );
          const appliedIndices = saleProducts
            .map((l, i) => (l.loyalty_reward === r.key ? i : -1))
            .filter((i) => i !== -1);

          if (eligibleIdx.length === 0 && appliedIndices.length === 0) {
            return null;
          }

          const isOpen = openReward === r.key;

          return (
            <div
              key={r.key}
              className="bg-white border border-amber-200 rounded-lg overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggle(r.key)}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between px-4 py-3 min-h-[44px] hover:bg-amber-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">
                    {r.title}
                  </span>
                  {appliedIndices.length > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.badgeColor}`}
                    >
                      {appliedIndices.length} aplicad
                      {appliedIndices.length === 1 ? "a" : "as"}
                    </span>
                  )}
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-amber-100 px-4 py-3 space-y-2">
                  {appliedIndices.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-slate-600 uppercase">
                        Aplicadas
                      </p>
                      {appliedIndices.map((idx) => {
                        const line = saleProducts[idx];
                        return (
                          <div
                            key={`applied-${idx}`}
                            className="flex items-center justify-between p-2 bg-green-50 rounded-lg"
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <span className="text-sm text-slate-900 capitalize truncate">
                                {line.product_name}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${r.badgeColor}`}
                              >
                                {r.badge}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <span className="text-xs text-green-700 font-semibold">
                                S/ {line.subtotal.toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => onRemoveReward(idx)}
                                disabled={isSubmitting}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Quitar promoción"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {eligibleIdx.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-slate-600 uppercase">
                        Productos elegibles
                      </p>
                      {eligibleIdx.map((idx) => {
                        const line = saleProducts[idx];
                        return (
                          <div
                            key={`eligible-${idx}`}
                            className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-slate-900 capitalize truncate">
                                {line.product_name}
                              </span>
                              <span className="ml-2 text-xs text-slate-500">
                                {line.quantity} × S/{" "}
                                {line.unit_price.toFixed(2)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => onApplyReward(idx, r.key)}
                              disabled={isSubmitting}
                              className="ml-2 px-3 py-2 min-h-[36px] bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-500 transition-colors disabled:opacity-50"
                            >
                              Aplicar
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
