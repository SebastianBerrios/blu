"use client";

import type { Account } from "@/types";

interface AccountSelectorProps {
  cajaAccount: Account | null | undefined;
  bancoAccount: Account | null | undefined;
  selectedAccountId: number | null;
  onSelect: (accountId: number) => void;
  onSelectBanco: (accountId: number) => void;
  isAdmin: boolean;
  isSubmitting: boolean;
}

export default function AccountSelector({
  cajaAccount,
  bancoAccount,
  selectedAccountId,
  onSelect,
  onSelectBanco,
  isAdmin,
  isSubmitting,
}: AccountSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-2">
        Pagar desde <span className="text-red-600">*</span>
      </label>
      <div className="flex gap-2">
        {!cajaAccount && !bancoAccount && (
          <p className="text-sm text-red-600">
            No hay cuentas configuradas. Contacta al administrador.
          </p>
        )}
        {cajaAccount && (
          <button
            type="button"
            onClick={() => onSelect(cajaAccount.id)}
            disabled={isSubmitting}
            className={`flex-1 px-4 py-3 min-h-[44px] rounded-lg border-2 font-medium transition-all ${
              selectedAccountId === cajaAccount.id
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
              if (isAdmin) {
                onSelectBanco(bancoAccount.id);
              }
            }}
            disabled={isSubmitting || !isAdmin}
            title={!isAdmin ? "Solo administradores pueden usar la cuenta bancaria" : undefined}
            className={`flex-1 px-4 py-3 min-h-[44px] rounded-lg border-2 font-medium transition-all ${
              selectedAccountId === bancoAccount.id
                ? "bg-blue-100 text-blue-700 border-blue-300"
                : !isAdmin
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Cuenta Bancaria
            {!isAdmin && <span className="block text-xs mt-0.5">Solo admin</span>}
          </button>
        )}
      </div>
    </div>
  );
}
