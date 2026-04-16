"use client";

import { ChevronDown, ChevronUp, SquarePen, Trash2, Banknote } from "lucide-react";
import type { SaleWithProducts } from "@/types";
import { formatTime } from "@/utils/helpers/dateFormatters";

const ORDER_TYPE_BADGE: Record<string, string> = {
  Mesa: "bg-blue-100 text-blue-700",
  "Para llevar": "bg-amber-100 text-amber-700",
  Delivery: "bg-green-100 text-green-700",
};

interface SaleCardProps {
  sale: SaleWithProducts;
  isExpanded: boolean;
  isAdmin: boolean;
  onToggle: (id: number) => void;
  onEdit: (sale: SaleWithProducts) => void;
  onDelete: (sale: SaleWithProducts) => void;
  onRegisterPayment: (sale: SaleWithProducts) => void;
}

export default function SaleCard({
  sale,
  isExpanded,
  isAdmin,
  onToggle,
  onEdit,
  onDelete,
  onRegisterPayment,
}: SaleCardProps) {
  const badgeClass =
    ORDER_TYPE_BADGE[sale.order_type] || "bg-gray-100 text-gray-700";

  return (
    <div
      className={`bg-white rounded-lg border shadow-sm overflow-hidden ${
        sale.payment_method
          ? "border-slate-200"
          : "border-slate-200 border-l-4 border-l-red-400"
      }`}
    >
      {/* Collapsed row */}
      <div
        className="flex items-center justify-between px-3 md:px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors min-h-[44px]"
        onClick={() => onToggle(sale.id)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-600 font-medium">
              {formatTime(sale.sale_date)}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}
            >
              {sale.order_type}
              {sale.order_type === "Mesa" && sale.table_number
                ? ` ${sale.table_number}`
                : ""}
            </span>
            {sale.payment_method ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                {sale.payment_method}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                Pendiente
              </span>
            )}
            {sale.customer_dni && (
              <span className="hidden md:inline px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                DNI: {sale.customer_dni}
              </span>
            )}
          </div>
          {sale.creator_name && (
            <div className="mt-0.5">
              <span className="text-xs text-slate-400">
                por {sale.creator_name}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between mt-1 md:hidden">
            <span className="text-xs text-slate-500">
              {sale.sale_products.length} producto
              {sale.sale_products.length !== 1 ? "s" : ""}
            </span>
            <span className="font-bold text-slate-900 text-sm">
              S/ {sale.total_price.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <span className="text-sm text-slate-600">
            {sale.sale_products.length} producto
            {sale.sale_products.length !== 1 ? "s" : ""}
          </span>
          <span className="font-bold text-slate-900">
            S/ {sale.total_price.toFixed(2)}
          </span>
          <div className="flex items-center gap-1">
            {!sale.payment_method && (
              <button
                onClick={(e) => { e.stopPropagation(); onRegisterPayment(sale); }}
                className="p-3 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                title="Registrar pago"
              >
                <Banknote className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(sale); }}
              className="p-3 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
              title="Editar"
            >
              <SquarePen className="w-5 h-5" />
            </button>
            {isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(sale); }}
                className="p-3 text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>

        {/* Mobile chevron */}
        <div className="md:hidden ml-2">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-slate-200 px-3 md:px-4 py-3 bg-slate-50/50">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-slate-600 uppercase pb-2">Producto</th>
                <th className="text-center text-xs font-medium text-slate-600 uppercase pb-2">Cant.</th>
                <th className="text-right text-xs font-medium text-slate-600 uppercase pb-2">P. Unit.</th>
                <th className="text-right text-xs font-medium text-slate-600 uppercase pb-2">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sale.sale_products.map((sp) => (
                <tr key={sp.id}>
                  <td className="py-2 text-sm text-slate-900 capitalize">
                    {sp.product_name}
                    {(sp.temperatura || sp.tipo_leche || sp.loyalty_reward) && (
                      <div className="flex gap-1.5 mt-0.5 flex-wrap">
                        {sp.temperatura && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                            {sp.temperatura}
                          </span>
                        )}
                        {sp.tipo_leche && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                            {sp.tipo_leche}
                          </span>
                        )}
                        {sp.loyalty_reward && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                            {sp.loyalty_reward === "50_postre" ? "50% desc." : "Gratis"}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-sm text-slate-900 text-center">{sp.quantity}</td>
                  <td className="py-2 text-sm text-slate-900 text-right">S/ {sp.unit_price.toFixed(2)}</td>
                  <td className="py-2 text-sm text-green-700 text-right font-semibold">
                    S/ {(sp.quantity * sp.unit_price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile action buttons */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 md:hidden">
            {!sale.payment_method && (
              <button
                onClick={() => onRegisterPayment(sale)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg font-medium text-sm active:scale-[0.97]"
              >
                <Banknote className="w-5 h-5" />
                Pagar
              </button>
            )}
            <button
              onClick={() => onEdit(sale)}
              className="p-3 text-primary-700 bg-primary-50 rounded-lg"
            >
              <SquarePen className="w-5 h-5" />
            </button>
            {isAdmin && (
              <button
                onClick={() => onDelete(sale)}
                className="p-3 text-red-700 bg-red-50 rounded-lg"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Payment detail */}
          <div className="mt-3 pt-3 border-t border-slate-200">
            {sale.payment_method ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-slate-600">Pago:</span>
                <span className="font-medium text-slate-900">{sale.payment_method}</span>
                {sale.payment_method === "Efectivo + Yape" && (
                  <span className="text-slate-500">
                    (Efectivo: S/ {sale.cash_amount?.toFixed(2)} | Yape: S/ {sale.yape_amount?.toFixed(2)})
                  </span>
                )}
                {sale.payment_date && (
                  <span className="text-slate-400 text-xs">
                    {formatTime(sale.payment_date)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-red-600 font-medium">Pago pendiente</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
