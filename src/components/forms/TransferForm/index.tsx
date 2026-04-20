"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { recordTransaction } from "@/hooks/useTransactions";
import { logAudit } from "@/utils/auditLog";

interface TransferFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferForm({
  isOpen,
  onClose,
  onSuccess,
}: TransferFormProps) {
  const { user, profile } = useAuth();
  const { accounts, cajaAccount, bancoAccount } = useAccounts();
  const [fromId, setFromId] = useState<number | null>(null);
  const [toId, setToId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFromId(cajaAccount?.id ?? null);
    setToId(bancoAccount?.id ?? null);
    setAmount("");
    setDescription("");
    setSubmitError(null);
  }, [isOpen, cajaAccount?.id, bancoAccount?.id]);

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === fromId) ?? null,
    [accounts, fromId],
  );
  const toAccount = useMemo(
    () => accounts.find((a) => a.id === toId) ?? null,
    [accounts, toId],
  );

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitError(null);
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setSubmitError("Ingresa un monto válido");
      return;
    }
    if (!fromAccount || !toAccount) {
      setSubmitError("Selecciona las cuentas de origen y destino");
      return;
    }
    if (fromAccount.id === toAccount.id) {
      setSubmitError("Las cuentas de origen y destino deben ser distintas");
      return;
    }

    setIsSubmitting(true);
    try {
      const desc =
        description.trim() || `Transferencia ${fromAccount.name} → ${toAccount.name}`;

      await recordTransaction({
        accountId: fromAccount.id,
        type: "transferencia_out",
        amount: -numAmount,
        description: desc,
        referenceType: "transfer",
      });

      await recordTransaction({
        accountId: toAccount.id,
        type: "transferencia_in",
        amount: numAmount,
        description: desc,
        referenceType: "transfer",
      });

      logAudit({
        userId: user?.id ?? null,
        userName: profile?.full_name ?? null,
        action: "crear_transaccion",
        targetTable: "transactions",
        targetDescription: `Transferencia ${fromAccount.name} → ${toAccount.name}: S/ ${numAmount.toFixed(2)}`,
        details: {
          tipo: "transferencia",
          origen: fromAccount.name,
          destino: toAccount.name,
          monto: numAmount,
          descripcion: description.trim() || null,
        },
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al transferir:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Ocurrió un error al realizar la transferencia",
      );
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
          <h2 className="text-xl font-semibold text-slate-900">Transferir entre cuentas</h2>
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
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1.5">
                Desde <span className="text-red-600">*</span>
              </label>
              <select
                value={fromId ?? ""}
                onChange={(e) => setFromId(e.target.value ? Number(e.target.value) : null)}
                disabled={isSubmitting}
                className="w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              >
                <option value="">Seleccionar</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="pb-3 text-slate-400">
              <ArrowRight className="w-5 h-5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1.5">
                Hasta <span className="text-red-600">*</span>
              </label>
              <select
                value={toId ?? ""}
                onChange={(e) => setToId(e.target.value ? Number(e.target.value) : null)}
                disabled={isSubmitting}
                className="w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              >
                <option value="">Seleccionar</option>
                {accounts
                  .filter((a) => a.id !== fromId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {fromAccount && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
              Saldo actual en {fromAccount.name}:{" "}
              <span className="font-bold">S/ {Number(fromAccount.balance).toFixed(2)}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Monto a transferir <span className="text-red-600">*</span>
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
              Descripción <span className="text-slate-500 text-xs">(opcional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              placeholder="Ej: Depósito del día"
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
              className="flex-1 px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Transfiriendo..." : "Transferir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
