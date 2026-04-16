"use client";

import { ChevronDown, ChevronUp, SquarePen, Trash2, Truck } from "lucide-react";
import type { PurchaseWithItems } from "@/types";
import { formatTime } from "@/utils/helpers/dateFormatters";

interface PurchaseCardProps {
  purchase: PurchaseWithItems;
  isExpanded: boolean;
  isAdmin: boolean;
  onToggle: (id: number) => void;
  onEdit: (purchase: PurchaseWithItems) => void;
  onDelete: (purchase: PurchaseWithItems) => void;
}

export default function PurchaseCard({
  purchase,
  isExpanded,
  isAdmin,
  onToggle,
  onEdit,
  onDelete,
}: PurchaseCardProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Collapsed row */}
      <div
        className="flex items-center justify-between px-3 md:px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors min-h-[44px]"
        onClick={() => onToggle(purchase.id)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-600 font-medium">
              {formatTime(purchase.created_at)}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">
              {purchase.purchaser_name ?? "Usuario"}
            </span>
            {purchase.has_delivery && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 flex items-center gap-1">
                <Truck className="w-3 h-3" />
                Delivery
              </span>
            )}
            {purchase.yape_change != null && purchase.yape_change > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                Vuelto Yape S/ {purchase.yape_change.toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-1 md:hidden">
            <span className="text-xs text-slate-500">
              {purchase.purchase_items.length} ítem{purchase.purchase_items.length !== 1 ? "s" : ""}
            </span>
            <span className="font-bold text-slate-900 text-sm">
              S/ {purchase.total.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {purchase.purchase_items.length} ítem{purchase.purchase_items.length !== 1 ? "s" : ""}
          </span>
          <span className="font-bold text-slate-900">
            S/ {purchase.total.toFixed(2)}
          </span>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(purchase); }}
                className="p-3 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
                title="Editar"
              >
                <SquarePen className="w-5 h-5" />
              </button>
            )}
            {isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(purchase); }}
                className="p-3 text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>

        <div className="md:hidden ml-2">
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-slate-200 px-3 md:px-4 py-3 bg-slate-50/50">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-slate-600 uppercase pb-2">Ítem</th>
                <th className="text-left text-xs font-medium text-slate-600 uppercase pb-2">Ingrediente</th>
                <th className="text-right text-xs font-medium text-slate-600 uppercase pb-2">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {purchase.purchase_items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 text-sm text-slate-900 capitalize">{item.item_name}</td>
                  <td className="py-2 text-sm">
                    {item.ingredient_id ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">Vinculado</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-2 text-sm text-green-700 text-right font-semibold">S/ {item.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
            {purchase.has_delivery && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  Delivery
                </span>
                <span className="font-medium text-slate-900">
                  S/ {(purchase.delivery_cost ?? 0).toFixed(2)}
                </span>
              </div>
            )}
            {purchase.notes && (
              <div className="text-sm">
                <span className="text-slate-600">Notas: </span>
                <span className="text-slate-900">{purchase.notes}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-1">
              <span className="text-slate-900">Total</span>
              <span className="text-green-700">S/ {purchase.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Mobile action buttons */}
          {isAdmin && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 md:hidden">
              <button
                onClick={() => onEdit(purchase)}
                className="p-3 text-primary-700 bg-primary-50 rounded-lg"
              >
                <SquarePen className="w-5 h-5" />
              </button>
              <button
                onClick={() => onDelete(purchase)}
                className="p-3 text-red-700 bg-red-50 rounded-lg"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
