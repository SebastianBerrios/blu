"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { recordTransaction } from "@/hooks/useTransactions";
import { logAudit } from "@/utils/auditLog";

interface ExtraIncomeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExtraIncomeForm({
  isOpen,
  onClose,
  onSuccess,
}: ExtraIncomeFormProps) {
  const { isAdmin, user, profile } = useAuth();
  const { cajaAccount, bancoAccount } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const accountId = selectedAccountId ?? cajaAccount?.id ?? null;

  const handleSubmit = async () => {
    setSubmitError(null);
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setSubmitError("Ingresa un monto válido");
      return;
    }
    if (!description.trim()) {
      setSubmitError("Ingresa una descripción del ingreso");
      return;
    }
    if (!accountId) {
      setSubmitError("Selecciona una cuenta");
      return;
    }

    setIsSubmitting(true);
    try {
      await recordTransaction({
        accountId,
        type: "ingreso_extra",
        amount: numAmount,
        description: description.trim(),
      });

      logAudit({
        userId: user?.id ?? null,
        userName: profile?.full_name ?? null,
        action: "crear_transaccion",
        targetTable: "transactions",
        targetDescription: `Ingreso extra: ${description.trim()} - S/ ${numAmount.toFixed(2)}`,
        details: { tipo: "ingreso_extra", monto: numAmount, cuenta: accountId === cajaAccount?.id ? "caja" : "banco" },
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al registrar ingreso:", error);
      setSubmitError(error instanceof Error ? error.message : "Ocurrió un error al registrar el ingreso");
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="text-xl font-semibold text-slate-900">
            Registrar Ingreso Extra
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Account selector */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Cuenta <span className="text-red-600">*</span>
            </label>
            <div className="flex gap-2">
              {cajaAccount && (
                <button
                  type="button"
                  onClick={() => setSelectedAccountId(cajaAccount.id)}
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-3 min-h-[44px] rounded-lg border-2 font-medium transition-all ${
                    accountId === cajaAccount.id
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Caja
                </button>
              )}
              {bancoAccount && (
                <button
                  type="button"
                  onClick={() => {
                    if (isAdmin) setSelectedAccountId(bancoAccount.id);
                  }}
                  disabled={isSubmitting || !isAdmin}
                  title={!isAdmin ? "Solo administradores" : undefined}
                  className={`flex-1 px-4 py-3 min-h-[44px] rounded-lg border-2 font-medium transition-all ${
                    accountId === bancoAccount.id
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : !isAdmin
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Banco
                  {!isAdmin && <span className="block text-xs mt-0.5">Solo admin</span>}
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Monto <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">S/</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Descripción <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              placeholder="Ej: Venta de equipos usados"
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
              className="flex-1 px-4 py-3 min-h-[44px] bg-green-700 text-white font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Registrando..." : "Registrar ingreso"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
