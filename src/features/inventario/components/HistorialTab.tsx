"use client";

import { Package, Truck, ShoppingCart, Clock, Trash2, Undo2, ChefHat } from "lucide-react";
import type { Ingredient, InventoryMovement } from "@/types";
import { formatDateTime } from "@/utils/helpers/dateFormatters";

function ReasonBadge({ reason }: { reason: string }) {
  const config: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    manual: {
      label: "Manual",
      icon: <Package className="w-3 h-3" />,
      className: "bg-slate-100 text-slate-700",
    },
    entrega: {
      label: "Entrega",
      icon: <Truck className="w-3 h-3" />,
      className: "bg-blue-100 text-blue-700",
    },
    compra: {
      label: "Compra",
      icon: <ShoppingCart className="w-3 h-3" />,
      className: "bg-green-100 text-green-700",
    },
    merma: {
      label: "Merma",
      icon: <Trash2 className="w-3 h-3" />,
      className: "bg-red-100 text-red-700",
    },
    produccion: {
      label: "Producción",
      icon: <ChefHat className="w-3 h-3" />,
      className: "bg-emerald-100 text-emerald-700",
    },
    produccion_consumo: {
      label: "Consumo producción",
      icon: <ChefHat className="w-3 h-3" />,
      className: "bg-orange-100 text-orange-700",
    },
    reverso_produccion: {
      label: "Reverso producción",
      icon: <Undo2 className="w-3 h-3" />,
      className: "bg-amber-100 text-amber-700",
    },
    reverso_entrega: {
      label: "Reverso entrega",
      icon: <Undo2 className="w-3 h-3" />,
      className: "bg-amber-100 text-amber-700",
    },
    reverso_compra: {
      label: "Reverso compra",
      icon: <Undo2 className="w-3 h-3" />,
      className: "bg-amber-100 text-amber-700",
    },
  };
  const cfg = config[reason] ?? config.manual;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

interface HistorialTabProps {
  movements: InventoryMovement[];
  ingredientMap: Map<number, Ingredient>;
}

export default function HistorialTab({ movements, ingredientMap }: HistorialTabProps) {
  if (movements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400">
        <Clock className="w-10 h-10 mb-2" />
        <p className="text-sm">No hay movimientos registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {movements.map((mov) => {
        const ingredient = ingredientMap.get(mov.ingredient_id);
        const name = ingredient?.name ?? `Ingrediente #${mov.ingredient_id}`;
        const unit = ingredient?.unit_of_measure ?? "";
        const delta = mov.new_quantity - mov.old_quantity;
        const isIncrease = delta >= 0;

        return (
          <div
            key={mov.id}
            className="bg-white rounded-xl border border-slate-200 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-slate-900 capitalize">{name}</p>
                  <ReasonBadge reason={mov.reason} />
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <span className="text-slate-500">{mov.old_quantity} {unit}</span>
                  <span className="text-slate-400">&rarr;</span>
                  <span className={`font-semibold ${isIncrease ? "text-emerald-600" : "text-red-600"}`}>
                    {mov.new_quantity} {unit}
                  </span>
                  <span className={`text-xs ${isIncrease ? "text-emerald-500" : "text-red-500"}`}>
                    ({isIncrease ? "+" : ""}{delta.toFixed(3).replace(/\.?0+$/, "")} {unit})
                  </span>
                </div>
                {mov.note && (
                  <p className="text-xs text-slate-500 mt-0.5 italic">{mov.note}</p>
                )}
                {mov.user_name && (
                  <p className="text-xs text-slate-500 mt-0.5">{mov.user_name}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-500">{formatDateTime(mov.created_at)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
