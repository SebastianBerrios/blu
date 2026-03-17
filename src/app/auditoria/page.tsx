"use client";

import { useState, useMemo } from "react";
import { ScrollText, ChevronDown, ChevronUp, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_TABLE_LABELS,
  type AuditAction,
  type AuditTargetTable,
  type AuditLog,
} from "@/types/auditLog";
import PageHeader from "@/components/ui/PageHeader";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { redirect } from "next/navigation";

const ACTION_COLORS: Record<AuditAction, string> = {
  eliminar: "bg-red-100 text-red-700",
  crear_venta: "bg-cyan-100 text-cyan-700",
  crear_transaccion: "bg-green-100 text-green-700",
  cambiar_estado_pedido: "bg-blue-100 text-blue-700",
  cambiar_rol: "bg-purple-100 text-purple-700",
  cambiar_estado_usuario: "bg-amber-100 text-amber-700",
  configurar_saldo: "bg-orange-100 text-orange-700",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

function groupLogsByDate(logs: AuditLog[]): { date: string; logs: AuditLog[] }[] {
  const groups: Record<string, AuditLog[]> = {};
  for (const log of logs) {
    const date = new Date(log.created_at).toISOString().split("T")[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(log);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, logs]) => ({ date, logs }));
}

export default function AuditoriaPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();

  // Filters
  const [filterAction, setFilterAction] = useState("");
  const [filterTable, setFilterTable] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const { logs, error, isLoading } = useAuditLogs({
    action: filterAction || undefined,
    targetTable: filterTable || undefined,
    startDate: filterStartDate || undefined,
    endDate: filterEndDate || undefined,
  });

  const [expandedId, setExpandedId] = useState<number | null>(null);

  const groupedLogs = useMemo(() => groupLogsByDate(logs), [logs]);

  const hasFilters = filterAction || filterTable || filterStartDate || filterEndDate;

  const clearFilters = () => {
    setFilterAction("");
    setFilterTable("");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  if (!authLoading && !isAdmin) {
    redirect("/");
  }

  return (
    <section className="h-full flex flex-col bg-slate-50">
      <PageHeader
        title="Auditoría"
        subtitle="Registro de operaciones críticas"
        icon={<ScrollText className="w-6 h-6 text-primary-700" />}
      />

      <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Filtros</h3>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="w-3 h-3" />
                Limpiar
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="">Todas las acciones</option>
              {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="">Todas las tablas</option>
              {Object.entries(AUDIT_TABLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="Desde"
            />

            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="Hasta"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">Error al cargar los registros: {error.message}</p>
          </div>
        )}

        {isLoading && <Spinner text="Cargando registros..." size="md" />}

        {!isLoading && logs.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <EmptyState
              icon={<ScrollText className="w-12 h-12" />}
              title="No hay registros"
              description="No se encontraron registros de auditoría"
            />
          </div>
        )}

        {!isLoading && logs.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base md:text-lg font-semibold text-slate-900">Registros</h3>
              <span className="text-sm text-slate-500">{logs.length} registros</span>
            </div>

            {groupedLogs.map((group) => (
              <div key={group.date}>
                <div className="px-3 md:px-4 py-2.5 md:py-3 bg-primary-100 rounded-lg mb-2">
                  <span className="font-semibold text-primary-900 capitalize text-sm md:text-base">
                    {formatDate(group.date)}
                  </span>
                  <span className="ml-3 text-sm text-primary-700">
                    {group.logs.length} registro{group.logs.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-2">
                  {group.logs.map((log) => {
                    const isExpanded = expandedId === log.id;
                    const actionColor = ACTION_COLORS[log.action as AuditAction] ?? "bg-gray-100 text-gray-700";
                    const tableLabel = AUDIT_TABLE_LABELS[log.target_table as AuditTargetTable] ?? log.target_table;
                    const actionLabel = AUDIT_ACTION_LABELS[log.action as AuditAction] ?? log.action;
                    const hasDetails = log.details && Object.keys(log.details as object).length > 0;

                    return (
                      <div
                        key={log.id}
                        className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
                      >
                        <div
                          className="flex items-center justify-between px-3 md:px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors min-h-[44px]"
                          onClick={() => hasDetails && setExpandedId(isExpanded ? null : log.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-slate-600 font-medium">
                                {formatTime(log.created_at)}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${actionColor}`}>
                                {actionLabel}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                                {tableLabel}
                              </span>
                            </div>
                            {log.target_description && (
                              <p className="text-sm text-slate-900 mt-1 truncate">
                                {log.target_description}
                              </p>
                            )}
                            <p className="text-xs text-slate-500 mt-0.5">
                              por {log.user_name ?? "Usuario desconocido"}
                            </p>
                          </div>

                          {hasDetails && (
                            <div className="ml-2 shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          )}
                        </div>

                        {isExpanded && hasDetails && (
                          <div className="border-t border-slate-200 px-3 md:px-4 py-3 bg-slate-50/50">
                            <p className="text-xs font-medium text-slate-600 mb-2">Detalles</p>
                            <pre className="text-xs text-slate-700 bg-white rounded-lg border border-slate-200 p-3 overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
