"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { PurchaseWithItems, PurchasesGroupedByDate } from "@/types";
import { formatDateLong } from "@/utils/helpers/dateFormatters";
import PurchaseCard from "./PurchaseCard";

interface PurchasesGroupedListProps {
  groupedPurchases: PurchasesGroupedByDate[];
  expandedPurchaseId: number | null;
  collapsedDates: Set<string>;
  isAdmin: boolean;
  onToggleExpand: (id: number) => void;
  onToggleDateGroup: (date: string) => void;
  onEdit: (purchase: PurchaseWithItems) => void;
  onDelete: (purchase: PurchaseWithItems) => void;
}

export default function PurchasesGroupedList({
  groupedPurchases,
  expandedPurchaseId,
  collapsedDates,
  isAdmin,
  onToggleExpand,
  onToggleDateGroup,
  onEdit,
  onDelete,
}: PurchasesGroupedListProps) {
  return (
    <>
      {groupedPurchases.map((group) => (
        <div key={group.date}>
          <div
            className="flex justify-between items-center px-3 md:px-4 py-2.5 md:py-3 bg-primary-100 rounded-lg mb-2 cursor-pointer select-none"
            onClick={() => onToggleDateGroup(group.date)}
          >
            <div className="flex items-center gap-2">
              {collapsedDates.has(group.date) ? (
                <ChevronDown className="w-4 h-4 text-primary-700" />
              ) : (
                <ChevronUp className="w-4 h-4 text-primary-700" />
              )}
              <span className="font-semibold text-primary-900 capitalize text-sm md:text-base">
                {formatDateLong(group.date)}
              </span>
            </div>
            {isAdmin && (
              <span className="font-bold text-green-700 text-sm">
                Total: S/ {group.dailyTotal.toFixed(2)}
              </span>
            )}
          </div>

          {!collapsedDates.has(group.date) && (
            <div className="space-y-2">
              {group.purchases.map((purchase) => (
                <PurchaseCard
                  key={purchase.id}
                  purchase={purchase}
                  isExpanded={expandedPurchaseId === purchase.id}
                  isAdmin={isAdmin}
                  onToggle={onToggleExpand}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
