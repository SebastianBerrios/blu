"use client";

import { useState } from "react";
import { redirect } from "next/navigation";
import {
  Wallet,
  Building2,
  Banknote,
  Bike,
  CreditCard,
  ListFilter,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransactionCategories } from "@/hooks/useTransactionCategories";
import { toLocalDateKey, groupByDate } from "@/utils/helpers/groupByDate";
import type { TransactionType, TransactionWithUser } from "@/types";
import TransferForm from "@/components/forms/TransferForm";
import ExpenseForm from "@/components/forms/ExpenseForm";
import ExtraIncomeForm from "@/components/forms/ExtraIncomeForm";
import InitialBalanceForm from "@/components/forms/InitialBalanceForm";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import DailySummary from "@/features/finanzas/components/DailySummary";
import CategoryBreakdown from "@/features/finanzas/components/CategoryBreakdown";
import TransactionCategoryManager from "@/features/finanzas/components/TransactionCategoryManager";
import BalanceCard from "@/features/finanzas/components/BalanceCard";
import FinanzasActions from "@/features/finanzas/components/FinanzasActions";
import TransactionFilters from "@/features/finanzas/components/TransactionFilters";
import TransactionDateGroup from "@/features/finanzas/components/TransactionDateGroup";
import { accountMeta } from "@/features/finanzas/components/accountMeta";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  ingreso_venta: { label: "Venta", color: "bg-green-100 text-green-700" },
  egreso_compra: { label: "Compra", color: "bg-red-100 text-red-700" },
  transferencia_in: { label: "Transferencia entrada", color: "bg-blue-100 text-blue-700" },
  transferencia_out: { label: "Transferencia salida", color: "bg-orange-100 text-orange-700" },
  gasto: { label: "Gasto", color: "bg-red-100 text-red-700" },
  ingreso_extra: { label: "Ingreso extra", color: "bg-emerald-100 text-emerald-700" },
};

export default function FinanzasPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();

  if (!authLoading && !isAdmin) {
    redirect("/");
  }
  const { cajaAccount, bancoAccount, rappiAccount, posAccount, error: accountsError, mutate: mutateAccounts } = useAccounts();
  const { categories } = useTransactionCategories();
  const [accountFilter, setAccountFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);
  const [expenseAccountId, setExpenseAccountId] = useState<number | null>(null);
  const [incomeAccountId, setIncomeAccountId] = useState<number | null>(null);
  const [showBalance, setShowBalance] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
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
      : accountFilter === "pos"
      ? posAccount?.id
      : undefined;

  const { transactions, isLoading, mutate: mutateTransactions } = useTransactions({
    accountId: filteredAccountId,
    type: typeFilter || undefined,
    categoryId: categoryFilter ? Number(categoryFilter) : undefined,
  });

  const handleSuccess = () => {
    mutateAccounts();
    mutateTransactions();
  };

  const transactionGroups = groupByDate(transactions, (t) => t.created_at);
  // Build a map keyed by date string for rendering (groupByDate returns sorted newest-first)
  const groupedTransactions: Record<string, typeof transactions> = Object.fromEntries(
    transactionGroups.map((g) => [g.date, g.items])
  );
  const sortedDates = transactionGroups.map((g) => g.date);

  const cajaBalance = Number(cajaAccount?.balance ?? 0);
  const bancoBalance = Number(bancoAccount?.balance ?? 0);
  const rappiBalance = Number(rappiAccount?.balance ?? 0);
  const posBalance = Number(posAccount?.balance ?? 0);

  const hasActiveFilter = accountFilter !== "all" || typeFilter !== "" || categoryFilter !== "";
  const ingresoCategories = categories.filter((c) => c.kind === "ingreso");
  const egresoCategories = categories.filter((c) => c.kind === "egreso");

  const resolveTypeInfo = (t: TransactionWithUser) =>
    TYPE_LABELS[t.type] ?? {
      label: t.type,
      color: "bg-gray-100 text-gray-700",
    };

  const resolveAccentBar = (t: TransactionWithUser) => {
    const accountType =
      t.account_id === cajaAccount?.id
        ? "caja"
        : t.account_id === bancoAccount?.id
        ? "banco"
        : t.account_id === rappiAccount?.id
        ? "rappi"
        : t.account_id === posAccount?.id
        ? "pos"
        : null;
    return accountType ? accountMeta(accountType).accentBar : "bg-slate-300";
  };

  return (
    <section className="h-full flex flex-col bg-slate-50">
      <PageHeader
        title="Finanzas"
        icon={<Wallet className="w-6 h-6 text-primary-700" />}
      />

      <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto space-y-4 md:space-y-6">
        {/* Daily summary */}
        <DailySummary date={summaryDate} onDateChange={setSummaryDate} />

        {/* Accounts error banner */}
        {accountsError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span>No se pudieron cargar los saldos de las cuentas. Los valores mostrados podrían no estar actualizados.</span>
          </div>
        )}

        {/* Balance cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <BalanceCard
            label="Caja"
            balance={cajaBalance}
            Icon={Banknote}
            accent="green"
            onExpense={() => cajaAccount && setExpenseAccountId(cajaAccount.id)}
            onIncome={() => cajaAccount && setIncomeAccountId(cajaAccount.id)}
          />
          <BalanceCard
            label="Cuenta Bancaria"
            balance={bancoBalance}
            Icon={Building2}
            accent="blue"
            onExpense={isAdmin && bancoAccount ? () => setExpenseAccountId(bancoAccount.id) : undefined}
            onIncome={isAdmin && bancoAccount ? () => setIncomeAccountId(bancoAccount.id) : undefined}
          />
          <BalanceCard
            label="Rappi"
            balance={rappiBalance}
            Icon={Bike}
            accent="orange"
            onExpense={isAdmin && rappiAccount ? () => setExpenseAccountId(rappiAccount.id) : undefined}
            onIncome={isAdmin && rappiAccount ? () => setIncomeAccountId(rappiAccount.id) : undefined}
          />
          <BalanceCard
            label="POS"
            balance={posBalance}
            Icon={CreditCard}
            accent="indigo"
            onExpense={isAdmin && posAccount ? () => setExpenseAccountId(posAccount.id) : undefined}
            onIncome={isAdmin && posAccount ? () => setIncomeAccountId(posAccount.id) : undefined}
          />
        </div>

        {/* Action buttons */}
        <FinanzasActions
          isAdmin={isAdmin}
          onTransfer={() => setShowTransfer(true)}
          onManageCategories={() => setShowCategories(true)}
          onConfigureBalances={() => setShowBalance(true)}
        />

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
                  setCategoryFilter("");
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Filters */}
          <TransactionFilters
            typeLabels={TYPE_LABELS}
            accountFilter={accountFilter}
            onAccountFilterChange={setAccountFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            ingresoCategories={ingresoCategories}
            egresoCategories={egresoCategories}
          />

          {/* Category totals */}
          {!isLoading && <CategoryBreakdown transactions={transactions} />}

          {/* Transactions list */}
          {isLoading ? (
            <div className="space-y-4 md:space-y-6">
              <div>
                <Skeleton className="h-4 w-48 mb-2" />
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-stretch gap-3 px-3 md:px-4 py-3">
                      <span className="shrink-0 w-1 rounded-full bg-slate-200" aria-hidden />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-3.5 w-40" />
                      </div>
                      <Skeleton className="h-4 w-20 self-center" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
              {hasActiveFilter
                ? "No hay transacciones que coincidan con los filtros"
                : "No hay transacciones registradas"}
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {sortedDates.map((date) => (
                <TransactionDateGroup
                  key={date}
                  date={date}
                  transactions={groupedTransactions[date]}
                  resolveTypeInfo={resolveTypeInfo}
                  resolveAccentBar={resolveAccentBar}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <TransferForm isOpen={showTransfer} onClose={() => setShowTransfer(false)} onSuccess={handleSuccess} />
      <ExpenseForm isOpen={expenseAccountId !== null} onClose={() => setExpenseAccountId(null)} onSuccess={handleSuccess} accountId={expenseAccountId!} />
      <ExtraIncomeForm isOpen={incomeAccountId !== null} onClose={() => setIncomeAccountId(null)} onSuccess={handleSuccess} accountId={incomeAccountId!} />
      <InitialBalanceForm isOpen={showBalance} onClose={() => setShowBalance(false)} onSuccess={handleSuccess} />
      <TransactionCategoryManager isOpen={showCategories} onClose={() => setShowCategories(false)} onSuccess={handleSuccess} />
    </section>
  );
}
