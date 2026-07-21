import { Trash2 } from "lucide-react";
import type { SaleProductLine, DiscountMode } from "../types";
import { resolveLineDiscount, round2 } from "../utils/discount";
import Badge from "@/components/ui/Badge";
import LineDiscountInput from "./LineDiscountInput";

interface SaleProductRowProps {
  item: SaleProductLine;
  idx: number;
  isSubmitting: boolean;
  canRemoveDelivered?: boolean;
  onRemoveProduct: (index: number) => void;
  onSetLineDiscount?: (index: number, mode: DiscountMode, value: number) => void;
  /** When true, renders a table <tr>; when false, renders a card <div>. */
  tableLayout: boolean;
}

/**
 * Single line item for a sale — shared between the mobile card list and the
 * desktop table in ProductSelector. Renders as a <tr> or a card <div>
 * based on the `tableLayout` prop. Behaviour and output are identical to
 * the previously inline per-view duplicates.
 */
export default function SaleProductRow({
  item,
  idx,
  isSubmitting,
  canRemoveDelivered = false,
  onRemoveProduct,
  onSetLineDiscount,
  tableLayout,
}: SaleProductRowProps) {
  const locked = item.status === "Entregado";
  const showDiscount = !!onSetLineDiscount && !locked;
  const lineDiscount = resolveLineDiscount(item);
  const lineNet = round2(item.subtotal - lineDiscount);

  const rowKey =
    item.id ??
    `${item.product_id}-${item.temperatura}-${item.tipo_leche}-${item.loyalty_reward ?? "none"}-${idx}`;

  const badges = (
    <>
      {item.temperatura && (
        <Badge tone={item.temperatura === "caliente" ? "tempCaliente" : "tempFrio"} size="sm">
          {item.temperatura}
        </Badge>
      )}
      {item.tipo_leche && (
        <Badge tone="milkType" size="sm">
          {item.tipo_leche}
        </Badge>
      )}
      {item.loyalty_reward && (
        <Badge
          tone={item.loyalty_reward === "50_postre" ? "loyaltyDiscount" : "loyaltyFree"}
          size="sm"
        >
          {item.loyalty_reward === "50_postre" ? "50% desc." : "Gratis"}
        </Badge>
      )}
      {locked && (
        <Badge tone="delivered" size="sm">
          Entregado
        </Badge>
      )}
    </>
  );

  const priceCell = lineDiscount > 0 ? (
    <span className="flex flex-col items-end leading-tight">
      <span className="text-[10px] text-slate-400 line-through">
        S/ {item.subtotal.toFixed(2)}
      </span>
      <span className="text-sm font-semibold text-green-600">
        S/ {lineNet.toFixed(2)}
      </span>
    </span>
  ) : (
    <span className="text-sm font-semibold text-green-600">
      S/ {item.subtotal.toFixed(2)}
    </span>
  );

  const removeButton = (!locked || canRemoveDelivered) ? (
    <button
      type="button"
      onClick={() => onRemoveProduct(idx)}
      disabled={isSubmitting}
      className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
      title="Eliminar producto"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  ) : null;

  if (tableLayout) {
    return (
      <tr
        key={rowKey}
        className={`transition-colors ${locked ? "bg-emerald-50/30" : "hover:bg-slate-50"}`}
      >
        <td className="px-4 py-3 text-sm text-slate-900 capitalize">
          {item.product_name}
          {(item.temperatura || item.tipo_leche || item.loyalty_reward || locked) && (
            <div className="flex gap-1 mt-0.5 flex-wrap">{badges}</div>
          )}
          {showDiscount && (
            <div className="mt-1.5">
              <LineDiscountInput
                mode={item.discount_mode ?? "porcentaje"}
                value={item.discount_value}
                onChange={(mode, value) => onSetLineDiscount!(idx, mode, value)}
                disabled={isSubmitting}
              />
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-slate-900 text-center">{item.quantity}</td>
        <td className="px-4 py-3 text-sm text-slate-900 text-right">
          S/ {item.unit_price.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-sm text-slate-900 text-right font-semibold">
          {lineDiscount > 0 ? (
            <span className="flex flex-col items-end leading-tight">
              <span className="text-[10px] text-slate-400 line-through">
                S/ {item.subtotal.toFixed(2)}
              </span>
              <span className="text-green-600">S/ {lineNet.toFixed(2)}</span>
            </span>
          ) : (
            <span className="text-green-600">S/ {item.subtotal.toFixed(2)}</span>
          )}
        </td>
        <td className="px-4 py-3 text-center">{removeButton}</td>
      </tr>
    );
  }

  // Mobile card layout
  return (
    <div
      key={rowKey}
      className={`p-3 rounded-lg ${locked ? "bg-emerald-50/40" : "bg-slate-50"}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 capitalize truncate">
            {item.product_name}
          </p>
          {(item.temperatura || item.tipo_leche || item.loyalty_reward || locked) && (
            <div className="flex gap-1 mt-0.5 flex-wrap">{badges}</div>
          )}
          <p className="text-xs text-slate-500">
            {item.quantity} × S/ {item.unit_price.toFixed(2)}
          </p>
        </div>
        <div className="flex items-center gap-3 ml-3">
          {priceCell}
          {removeButton}
        </div>
      </div>
      {showDiscount && (
        <div className="mt-2 flex justify-end">
          <LineDiscountInput
            mode={item.discount_mode ?? "porcentaje"}
            value={item.discount_value}
            onChange={(mode, value) => onSetLineDiscount!(idx, mode, value)}
            disabled={isSubmitting}
          />
        </div>
      )}
    </div>
  );
}
