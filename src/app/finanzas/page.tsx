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
  Bike,
  ListFilter,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { toLocalDateKey } from "@/utils/helpers/groupByDate";
import type { TransactionType } from "@/types";
import TransferForm from "@/components/forms/TransferForm";
import ExpenseForm from "@/components/forms/ExpenseForm";
import ExtraIncomeForm from "@/components/forms/ExtraIncomeForm";
import InitialBalanceForm from "@/components/forms/InitialBalanceForm";
import PageHeader from "@/components/ui/PageHeader";
import DailySummary from "@/features/finanzas/components/DailySummary";

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
  { value: "rappi", label: "Rappi" },
];

export default function FinanzasPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();

  if (!authLoading && !isAdmin) {
    redirect("/");
  }
  const { cajaAccount, bancoAccount, rappiAccount, mutate: mutateAccounts } = useAccounts();
  const [accountFilter, setAccountFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("");
  const [showTransfer, setShowTransfer] = useState(false);
  const [expenseAccountId, setExpenseAccountId] = useState<number | null>(null);
  const [showIncome, setShowIncome] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [summaryDate, setSummaryDate] = useState(() =>
    toLocalDateKey(new Date().toISOString()),
  );

  const filteredAccountId =
    accountFilter === "caja"
      ? cajaAccount?.id
      : accountFilter === "banco"
      ? bancoAccount?.id
      : accountFilter === "rappi"
      ? rappiAccount?.id
      : undefined;

  const { transactions, isLoading, mutate: mutateTransactions } = useTransactions({
    accountId: filteredAccountId,
    type: typeFilter || undefined,
  });

  const handleSuccess = () => {
    mutateAccounts();
    mutateTransactions();
  };

  const groupedTransactions: Record<string, typeof transactions> = {};
  for (const t of transactions) {
    const date = toLocalDateKey(t.created_at);
    if (!groupedTransactions[date]) groupedTransactions[date] = [];
    groupedTransactions[date].push(t);
  }
  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  const cajaBalance = Number(cajaAccount?.balance ?? 0);
  const bancoBalance = Number(bancoAccount?.balance ?? 0);
  const rappiBalance = Number(rappiAccount?.balance ?? 0);

  const hasActiveFilter = accountFilter !== "all" || typeFilter !== "";

  return (
    <section className="h-full flex flex-col bg-slate-50">
      <PageHeader
        title="Finanzas"
        icon={<Wallet className="w-6 h-6 text-primary-700" />}
      />

      <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto space-y-4 md:space-y-6">
        {/* Daily summary */}
        <DailySummary date={summaryDate} onDateChange={setSummaryDate} />

        {/* Balance cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <BalanceCard
            label="Caja"
            balance={cajaBalance}
            Icon={Banknote}
            accent="green"
            onExpense={() => cajaAccount && setExpenseAccountId(cajaAccount.id)}
            onIncome={() => setShowIncome(true)}
          />
          <BalanceCard
            label="Cuenta Bancaria"
            balance={bancoBalance}
            Icon={Building2}
            accent="blue"
            onExpense={isAdmin && bancoAccount ? () => setExpenseAccountId(bancoAccount.id) : undefined}
            onIncome={isAdmin ? () => setShowIncome(true) : undefined}
          />
          <BalanceCard
            label="Rappi"
            balance={rappiBalance}
            Icon={Bike}
            accent="orange"
            onExpense={isAdmin && rappiAccount ? () => setExpenseAccountId(rappiAccount.id) : undefined}
            onIncome={isAdmin ? () => setShowIncome(true) : undefined}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowTransfer(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary-900 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm min-h-[44px] active:scale-[0.97] shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span className="truncate">Transferir entre cuentas</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowBalance(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 border-2 border-primary-300 text-primary-700 bg-white rounded-lg hover:bg-primary-50 transition-colors font-medium text-sm min-h-[44px] active:scale-[0.97]"
            >
              <Settings className="w-4 h-4" />
              <span className="truncate">Configurar saldos</span>
            </button>
          )}
        </div>

        {/* Transactions section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm md:text-base font-semibold text-slate-700 flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-slate-500" />
              Transacciones
              <span className="text-xs font-normal text-slate-500 tabular-nums">
                ({transactions.length})
              </span>
            </h2>
            {hasActiveFilter && (
              <button
                onClick={() => {
                  setAccountFilter("all");
                  setTypeFilter("");
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAccountFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    accountFilter === opt.value
                      ? "bg-primary-100 text-primary-800"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TransactionType | "")}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none shadow-sm"
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
            <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
              {hasActiveFilter
                ? "No hay transacciones que coincidan con los filtros"
                : "No hay transacciones registradas"}
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {sortedDates.map((date) => (
                <div key={date}>
                  <h3 className="text-xs md:text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                    {new Date(date + "T12:00:00").toLocaleDateString("es-PE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
                    {groupedTransactions[date].map((t) => {
                      const typeInfo = TYPE_LABELS[t.type] ?? {
                        label: t.type,
                        color: "bg-gray-100 text-gray-700",
                      };
                      const isPositive = t.amount > 0;
                      const isCaja = t.account_id === cajaAccount?.id;
                      const isBanco = t.account_id === bancoAccount?.id;
                      const isRappi = t.account_id === rappiAccount?.id;
                      const accentBar = isCaja
                        ? "bg-green-400"
                        : isBanco
                        ? "bg-blue-400"
                        : isRappi
                        ? "bg-orange-400"
                        : "bg-slate-300";

                      return (
                        <div
                          key={t.id}
                          className="flex items-stretch gap-3 px-3 md:px-4 py-3 hover:bg-slate-50/60 transition-colors"
                        >
                          <span
                            className={`shrink-0 w-1 rounded-full ${accentBar}`}
                            aria-hidden
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className="text-[11px] text-slate-400 tabular-nums">
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
                              <p className="text-[11px] text-slate-400 mt-0.5">por {t.user_name}</p>
                            )}
                          </div>
                          <span
                            className={`self-center text-sm font-bold whitespace-nowrap tabular-nums ${
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
      </div>

      {/* Modals */}
      <TransferForm isOpen={showTransfer} onClose={() => setShowTransfer(false)} onSuccess={handleSuccess} />
      <ExpenseForm isOpen={expenseAccountId !== null} onClose={() => setExpenseAccountId(null)} onSuccess={handleSuccess} accountId={expenseAccountId!} />
      <ExtraIncomeForm isOpen={showIncome} onClose={() => setShowIncome(false)} onSuccess={handleSuccess} />
      <InitialBalanceForm isOpen={showBalance} onClose={() => setShowBalance(false)} onSuccess={handleSuccess} />
    </section>
  );
}

interface BalanceCardProps {
  label: string;
  balance: number;
  Icon: typeof Banknote;
  accent: "green" | "blue" | "orange";
  onExpense?: () => void;
  onIncome?: () => void;
}

function BalanceCard({ label, balance, Icon, accent, onExpense, onIncome }: BalanceCardProps) {
  const isNeg = balance < 0;
  const palette =
    accent === "green"
      ? {
          border: "border-green-200",
          bg: "bg-green-50",
          icon: "text-green-700",
          label: "text-green-800",
          value: "text-green-900",
        }
      : accent === "blue"
      ? {
          border: "border-blue-200",
          bg: "bg-blue-50",
          icon: "text-blue-700",
          label: "text-blue-800",
          value: "text-blue-900",
        }
      : {
          border: "border-orange-200",
          bg: "bg-orange-50",
          icon: "text-orange-700",
          label: "text-orange-800",
          value: "text-orange-900",
        };

  return (
    <div
      className={`rounded-xl border-2 p-4 md:p-5 shadow-sm ${
        isNeg ? "border-red-300 bg-red-50" : `${palette.border} ${palette.bg}`
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${isNeg ? "text-red-700" : palette.icon}`} />
          <span className={`text-sm font-semibold ${isNeg ? "text-red-800" : palette.label}`}>
            {label}
          </span>
        </div>
        {isNeg && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
            Negativo
          </span>
        )}
      </div>
      <p
        className={`text-2xl md:text-3xl font-bold tabular-nums ${
          isNeg ? "text-red-700" : palette.value
        }`}
      >
        S/ {balance.toFixed(2)}
      </p>
      {(onExpense || onIncome) && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          {onExpense ? (
            <button
              onClick={onExpense}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium bg-white/90 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors min-h-[44px] active:scale-[0.97]"
            >
              <MinusCircle className="w-4 h-4" />
              Gasto
            </button>
          ) : (
            <span />
          )}
          {onIncome ? (
            <button
              onClick={onIncome}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium bg-white/90 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors min-h-[44px] active:scale-[0.97]"
            >
              <PlusCircle className="w-4 h-4" />
              Ingreso
            </button>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
