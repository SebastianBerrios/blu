"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { logAudit } from "@/utils/auditLog";

interface InitialBalanceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InitialBalanceForm({
  isOpen,
  onClose,
  onSuccess,
}: InitialBalanceFormProps) {
  const { user, profile } = useAuth();
  const { cajaAccount, bancoAccount } = useAccounts();
  const [cajaBalance, setCajaBalance] = useState("");
  const [bancoBalance, setBancoBalance] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const supabase = createClient();

      if (cajaBalance.trim() && cajaAccount) {
        const { error } = await supabase
          .from("accounts")
          .update({ balance: parseFloat(cajaBalance), updated_at: new Date().toISOString() })
          .eq("id", cajaAccount.id);
        if (error) throw error;
      }

      if (bancoBalance.trim() && bancoAccount) {
        const { error } = await supabase
          .from("accounts")
          .update({ balance: parseFloat(bancoBalance), updated_at: new Date().toISOString() })
          .eq("id", bancoAccount.id);
        if (error) throw error;
      }
      logAudit({
        userId: user?.id ?? null,
        userName: profile?.full_name ?? null,
        action: "configurar_saldo",
        targetTable: "accounts",
        targetDescription: "Configuración de saldos",
        details: {
          caja: cajaBalance.trim() ? parseFloat(cajaBalance) : undefined,
          banco: bancoBalance.trim() ? parseFloat(bancoBalance) : undefined,
          caja_anterior: cajaAccount ? Number(cajaAccount.balance) : undefined,
          banco_anterior: bancoAccount ? Number(bancoAccount.balance) : undefined,
        },
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al configurar saldos:", error);
      setSubmitError(error instanceof Error ? error.message : "Ocurrió un error al configurar los saldos");
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
            Configurar Saldos
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
          <p className="text-sm text-slate-600">
            Configura los saldos iniciales de las cuentas. Deja vacío para no modificar.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Saldo de Caja
              {cajaAccount && (
                <span className="text-slate-500 text-xs ml-2">
                  (Actual: S/ {Number(cajaAccount.balance).toFixed(2)})
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">S/</span>
              <input
                type="number"
                step="0.01"
                value={cajaBalance}
                onChange={(e) => setCajaBalance(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                placeholder="No modificar"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Saldo de Cuenta Bancaria
              {bancoAccount && (
                <span className="text-slate-500 text-xs ml-2">
                  (Actual: S/ {Number(bancoAccount.balance).toFixed(2)})
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">S/</span>
              <input
                type="number"
                step="0.01"
                value={bancoBalance}
                onChange={(e) => setBancoBalance(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                placeholder="No modificar"
              />
            </div>
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
              {isSubmitting ? "Guardando..." : "Guardar saldos"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
