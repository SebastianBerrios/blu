"use client";

import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { discardInventory } from "../services/inventoryService";
import type { Ingredient } from "@/types";

const MOTIVOS = ["Merma", "Vencido", "Dañado", "Otro"] as const;

interface DiscardFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ingredient: Ingredient | null;
  userId: string | null;
  userName: string | null;
}

export default function DiscardForm({
  isOpen,
  onClose,
  onSuccess,
  ingredient,
  userId,
  userName,
}: DiscardFormProps) {
  const [quantity, setQuantity] = useState("");
  const [motivo, setMotivo] = useState<string>(MOTIVOS[0]);
  const [nota, setNota] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuantity("");
      setMotivo(MOTIVOS[0]);
      setNota("");
      setSubmitError(null);
    }
  }, [isOpen]);

  if (!isOpen || !ingredient) return null;

  const handleSubmit = async () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setSubmitError("Ingresa una cantidad mayor a 0");
      return;
    }

    const note = nota.trim() ? `${motivo} — ${nota.trim()}` : motivo;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await discardInventory(ingredient, qty, note, userId, userName);
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al descartar");
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            Descartar stock
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
            <span className="font-medium capitalize text-slate-900">{ingredient.name}</span>
            {" "}— stock actual:{" "}
            <span className="font-semibold">
              {ingredient.stock_quantity} {ingredient.unit_of_measure}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Cantidad a descartar <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                min="0.001"
                step="0.001"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setSubmitError(null);
                }}
                disabled={isSubmitting}
                autoFocus
                className="w-full pl-4 pr-14 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                {ingredient.unit_of_measure}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Motivo <span className="text-red-600">*</span>
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            >
              {MOTIVOS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Nota <span className="text-slate-500 text-xs">(opcional)</span>
            </label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              disabled={isSubmitting}
              rows={2}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100 resize-none"
              placeholder="Detalle del descarte..."
            />
          </div>

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
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 min-h-[44px] bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Descartando..." : "Descartar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
