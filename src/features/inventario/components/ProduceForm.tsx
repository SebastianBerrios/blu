"use client";

import { useState, useEffect } from "react";
import { X, ChefHat, AlertTriangle } from "lucide-react";
import {
  fetchConsumption,
  produceRecipeBatch,
} from "../services/productionService";
import type { Producible, ProductionConsumptionLine } from "@/types";

interface ProduceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  producible: Producible | null;
  userId: string | null;
  userName: string | null;
}

function fmt(n: number): string {
  return Number(n.toFixed(3)).toString();
}

export default function ProduceForm({
  isOpen,
  onClose,
  onSuccess,
  producible,
  userId,
  userName,
}: ProduceFormProps) {
  const [batches, setBatches] = useState("1");
  const [consumption, setConsumption] = useState<ProductionConsumptionLine[]>([]);
  const [loadingConsumption, setLoadingConsumption] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && producible) {
      setBatches("1");
      setSubmitError(null);
      setLoadingConsumption(true);
      fetchConsumption(producible.recipe_id)
        .then(setConsumption)
        .catch(() => setConsumption([]))
        .finally(() => setLoadingConsumption(false));
    }
  }, [isOpen, producible]);

  if (!isOpen || !producible) return null;

  const batchesNum = parseFloat(batches);
  const validBatches = !isNaN(batchesNum) && batchesNum > 0;
  const yieldAdded = validBatches ? producible.yield * batchesNum : 0;

  const hasInsufficient = consumption.some(
    (c) => validBatches && c.per_batch * batchesNum > c.stock_quantity,
  );

  const handleSubmit = async () => {
    if (!validBatches) {
      setSubmitError("Ingresa un número de lotes mayor a 0");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await produceRecipeBatch(producible, batchesNum, userId, userName);
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al producir");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl sticky top-0">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-emerald-600" />
            Producir lote
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-sm text-slate-600">
            <span className="font-medium capitalize text-slate-900">{producible.ingredient_name}</span>
            {" — "}stock actual:{" "}
            <span className="font-semibold">
              {fmt(producible.stock_quantity)} {producible.ingredient_unit}
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Cada lote rinde {fmt(producible.yield)} {producible.yield_unit} (receta: {producible.recipe_name})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Número de lotes <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="1"
              value={batches}
              onChange={(e) => {
                setBatches(e.target.value);
                setSubmitError(null);
              }}
              disabled={isSubmitting}
              autoFocus
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            />
          </div>

          {/* Resultado: unidades terminadas */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-emerald-900 font-medium">Se agregará al stock</span>
            <span className="text-sm font-bold text-emerald-700">
              +{fmt(yieldAdded)} {producible.ingredient_unit}
            </span>
          </div>

          {/* Consumo de ingredientes */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-2">Se consumirá</h3>
            {loadingConsumption ? (
              <p className="text-sm text-slate-500">Calculando…</p>
            ) : consumption.length === 0 ? (
              <p className="text-sm text-slate-500">La receta no tiene ingredientes registrados.</p>
            ) : (
              <ul className="space-y-1.5">
                {consumption.map((c) => {
                  const needed = validBatches ? c.per_batch * batchesNum : 0;
                  const insufficient = needed > c.stock_quantity;
                  return (
                    <li
                      key={c.ingredient_id}
                      className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-slate-50"
                    >
                      <span className="capitalize text-slate-700 truncate">{c.ingredient_name}</span>
                      <span className={`shrink-0 ml-2 font-medium ${insufficient ? "text-red-600" : "text-slate-600"}`}>
                        −{fmt(needed)} {c.ingredient_unit}
                        <span className="text-xs text-slate-500 ml-1">
                          (stock {fmt(c.stock_quantity)})
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {hasInsufficient && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Algún ingrediente no tiene stock suficiente. Puedes producir igual, pero ese stock quedará en 0.
              </p>
            </div>
          )}

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 min-h-[44px] border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !validBatches}
              className="flex-1 px-4 py-3 min-h-[44px] bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Produciendo…" : "Producir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
