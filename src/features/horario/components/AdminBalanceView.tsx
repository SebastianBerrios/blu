"use client";

import { useState, useMemo } from "react";
import { ROLE_COLORS } from "../constants";
import LedgerList from "./LedgerList";

interface AdminBalanceViewProps {
  balances: {
    user_id: string;
    user_name: string;
    balance: number;
    total_credits: number;
    total_debits: number;
  }[];
  entries: {
    user_id: string;
    user_name: string | null;
    hours: number;
    description: string;
    created_at: string;
  }[];
  users: { id: string; full_name: string | null; role: string | null }[];
}

export default function AdminBalanceView({
  balances,
  entries,
  users,
}: AdminBalanceViewProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const allUsers = useMemo(() => {
    return users.map((u) => {
      const b = balances.find((b) => b.user_id === u.id);
      return {
        user_id: u.id,
        user_name: u.full_name ?? "Sin nombre",
        user_role: u.role ?? "",
        balance: b?.balance ?? 0,
        total_credits: b?.total_credits ?? 0,
        total_debits: b?.total_debits ?? 0,
      };
    });
  }, [users, balances]);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allUsers.map((u) => {
          const colors = ROLE_COLORS[u.user_role] ?? ROLE_COLORS.admin;
          return (
            <button
              key={u.user_id}
              onClick={() =>
                setSelectedUserId(
                  selectedUserId === u.user_id ? null : u.user_id
                )
              }
              className={`bg-white rounded-xl border p-4 text-left transition-colors ${
                selectedUserId === u.user_id
                  ? "border-primary-300 ring-1 ring-primary-200"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-slate-900 text-sm">
                  {u.user_name}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
                >
                  {u.user_role}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-primary-700">
                  {u.balance}
                </span>
                <span className="text-sm text-slate-500">horas</span>
              </div>
              <div className="flex gap-3 mt-1 text-xs text-slate-400">
                <span>+{u.total_credits}h ganadas</span>
                <span>-{u.total_debits}h usadas</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Ledger for selected user */}
      {selectedUserId && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h4 className="text-sm font-semibold text-slate-700">
              Historial de{" "}
              {allUsers.find((u) => u.user_id === selectedUserId)?.user_name}
            </h4>
          </div>
          <LedgerList
            entries={entries.filter((e) => e.user_id === selectedUserId)}
          />
        </div>
      )}
    </div>
  );
}
