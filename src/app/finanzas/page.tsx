"use client";

import { useState } from "react";
import { redirect } from "next/navigation";
import {
  Wallet,
  ArrowRightLeft,
  MinusCircle,
  PlusCircle,
  Settings,
  Building2,
  Banknote,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { toLocalDateKey } from "@/hooks/useSales";
import type { TransactionType } from "@/types";
import TransferForm from "@/components/forms/TransferForm";
import ExpenseForm from "@/components/forms/ExpenseForm";
import ExtraIncomeForm from "@/components/forms/ExtraIncomeForm";
import InitialBalanceForm from "@/components/forms/InitialBalanceForm";
import PageHeader from "@/components/ui/PageHeader";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  ingreso_venta: { label: "Venta", color: "bg-green-100 text-green-700" },
  egreso_compra: { label: "Compra", color: "bg-red-100 text-red-700" },
  transferencia_in: { label: "Transferencia entrada", color: "bg-blue-100 text-blue-700" },
  transferencia_out: { label: "Transferencia salida", color: "bg-orange-100 text-orange-700" },
  gasto: { label: "Gasto", color: "bg-red-100 text-red-700" },
  ingreso_extra: { label: "Ingreso extra", color: "bg-emerald-100 text-emerald-700" },
};

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "caja", label: "Caja" },
  { value: "banco", label: "Banco" },
];

export default function FinanzasPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();

  if (!authLoading && !isAdmin) {
    redirect("/");
  }
  const { cajaAccount, bancoAccount, mutate: mutateAccounts } = useAccounts();
  const [accountFilter, setAccountFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("");
  const [showTransfer, setShowTransfer] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [showBalance, setShowBalance] = useState(false);

  const filteredAccountId =
    accountFilter === "caja"
      ? cajaAccount?.id
      : accountFilter === "banco"
      ? bancoAccount?.id
      : undefined;

  const { transactions, isLoading, mutate: mutateTransactions } = useTransactions({
    accountId: filteredAccountId,
    type: typeFilter || undefined,
  });

  const handleSuccess = () => {
    mutateAccounts();
    mutateTransactions();
  };

  // Group transactions by date
  const groupedTransactions: Record<string, typeof transactions> = {};
  for (const t of transactions) {
    const date = toLocalDateKey(t.created_at);
    if (!groupedTransactions[date]) groupedTransactions[date] = [];
    groupedTransactions[date].push(t);
  }
  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  const cajaBalance = Number(cajaAccount?.balance ?? 0);
  const bancoBalance = Number(bancoAccount?.balance ?? 0);

  return (
    <section className="h-full flex flex-col bg-slate-50">
      <PageHeader
        title="Finanzas"
        icon={<Wallet className="w-6 h-6 text-primary-700" />}
      />

      <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto space-y-4 md:space-y-6">
        {/* Balance cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {/* Caja */}
          <div className={`rounded-xl border-2 p-4 md:p-5 ${cajaBalance < 0 ? "border-red-300 bg-red-50" : "border-green-200 bg-green-50"}`}>
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="w-5 h-5 text-green-700" />
              <span className="text-sm font-medium text-green-800">Caja</span>
            </div>
            <p className={`text-2xl md:text-3xl font-bold ${cajaBalance < 0 ? "text-red-700" : "text-green-900"}`}>
              S/ {cajaBalance.toFixed(2)}
            </p>
            {cajaBalance < 0 && <p className="text-xs text-red-600 mt-1">Saldo negativo</p>}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => setShowExpense(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors min-h-[44px]"
              >
                <MinusCircle className="w-4 h-4" />
                Gasto
              </button>
              <button
                onClick={() => setShowIncome(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium bg-white border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-colors min-h-[44px]"
              >
                <PlusCircle className="w-4 h-4" />
                Ingreso
              </button>
            </div>
          </div>

          {/* Banco */}
          <div className={`rounded-xl border-2 p-4 md:p-5 ${bancoBalance < 0 ? "border-red-300 bg-red-50" : "border-blue-200 bg-blue-50"}`}>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-blue-700" />
              <span className="text-sm font-medium text-blue-800">Cuenta Bancaria</span>
            </div>
            <p className={`text-2xl md:text-3xl font-bold ${bancoBalance < 0 ? "text-red-700" : "text-blue-900"}`}>
              S/ {bancoBalance.toFixed(2)}
            </p>
            {bancoBalance < 0 && <p className="text-xs text-red-600 mt-1">Saldo negativo</p>}
            {isAdmin && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={() => setShowExpense(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors min-h-[44px]"
                >
                  <MinusCircle className="w-4 h-4" />
                  Gasto
                </button>
                <button
                  onClick={() => setShowIncome(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium bg-white border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-colors min-h-[44px]"
                >
                  <PlusCircle className="w-4 h-4" />
                  Ingreso
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
          <button
            onClick={() => setShowTransfer(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-primary-900 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm min-h-[44px] active:scale-[0.97]"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span className="truncate">Transferir Caja → Banco</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowBalance(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium text-sm min-h-[44px] active:scale-[0.97]"
            >
              <Settings className="w-4 h-4" />
              <span className="truncate">Configurar saldos</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setAccountFilter(opt.value)}
              className={`px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all min-h-[44px] ${
                accountFilter === opt.value
                  ? "bg-primary-100 text-primary-800 border-primary-300"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TransactionType | "")}
            className="px-3 py-3 rounded-lg border border-slate-300 text-sm text-slate-700 focus:ring-2 focus:ring-primary-500 outline-none min-h-[44px]"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TYPE_LABELS).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Transactions list */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Cargando transacciones...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No hay transacciones registradas
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {sortedDates.map((date) => (
              <div key={date}>
                <h3 className="text-sm font-semibold text-slate-600 mb-2">
                  {new Date(date + "T12:00:00").toLocaleDateString("es-PE", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {groupedTransactions[date].map((t) => {
                    const typeInfo = TYPE_LABELS[t.type] ?? {
                      label: t.type,
                      color: "bg-gray-100 text-gray-700",
                    };
                    const isPositive = t.amount > 0;

                    return (
                      <div key={t.id} className="flex items-center gap-3 px-3 md:px-4 py-3 min-h-[44px]">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(t.created_at).toLocaleTimeString("es-PE", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {t.description && (
                            <p className="text-sm text-slate-700 truncate">{t.description}</p>
                          )}
                          {t.user_name && (
                            <p className="text-xs text-slate-400 mt-0.5">por {t.user_name}</p>
                          )}
                        </div>
                        <span
                          className={`text-sm font-bold whitespace-nowrap ${
                            isPositive ? "text-green-700" : "text-red-700"
                          }`}
                        >
                          {isPositive ? "+" : ""}S/ {Math.abs(t.amount).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <TransferForm isOpen={showTransfer} onClose={() => setShowTransfer(false)} onSuccess={handleSuccess} />
      <ExpenseForm isOpen={showExpense} onClose={() => setShowExpense(false)} onSuccess={handleSuccess} />
      <ExtraIncomeForm isOpen={showIncome} onClose={() => setShowIncome(false)} onSuccess={handleSuccess} />
      <InitialBalanceForm isOpen={showBalance} onClose={() => setShowBalance(false)} onSuccess={handleSuccess} />
    </section>
  );
}
