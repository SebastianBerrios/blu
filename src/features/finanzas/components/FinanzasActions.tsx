"use client";

import { ArrowRightLeft, Settings, Tags } from "lucide-react";

export interface FinanzasActionsProps {
  isAdmin: boolean;
  onTransfer: () => void;
  onManageCategories: () => void;
  onConfigureBalances: () => void;
}

export default function FinanzasActions({
  isAdmin,
  onTransfer,
  onManageCategories,
  onConfigureBalances,
}: FinanzasActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <button
        onClick={onTransfer}
        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary-900 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm min-h-[44px] active:scale-[0.97] shadow-sm"
      >
        <ArrowRightLeft className="w-4 h-4" />
        <span className="truncate">Transferir entre cuentas</span>
      </button>
      {isAdmin && (
        <button
          onClick={onManageCategories}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 border-2 border-primary-300 text-primary-700 bg-white rounded-lg hover:bg-primary-50 transition-colors font-medium text-sm min-h-[44px] active:scale-[0.97]"
        >
          <Tags className="w-4 h-4" />
          <span className="truncate">Categorías</span>
        </button>
      )}
      {isAdmin && (
        <button
          onClick={onConfigureBalances}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 border-2 border-primary-300 text-primary-700 bg-white rounded-lg hover:bg-primary-50 transition-colors font-medium text-sm min-h-[44px] active:scale-[0.97]"
        >
          <Settings className="w-4 h-4" />
          <span className="truncate">Configurar saldos</span>
        </button>
      )}
    </div>
  );
}
