"use client";

import { useState, useMemo } from "react";
import {
  SquarePen,
  Trash2,
  Lock,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ArrowUpDown,
  Search,
  Inbox,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

type SortDirection = "asc" | "desc" | null;

interface DataTableProps<T> {
  title: string;
  columns: string[];
  dataKeys: (keyof T)[];
  data: T[];
  isLoading?: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  canEdit?: (item: T) => boolean;
  renderCard?: (item: T, onEdit?: (item: T) => void, onDelete?: (item: T) => void) => React.ReactNode;
}

export default function DataTable<T extends { id: number; name: string }>({
  title,
  columns,
  dataKeys,
  data,
  isLoading = false,
  onEdit,
  onDelete,
  canEdit,
  renderCard,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [showMobileSort, setShowMobileSort] = useState(false);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase().trim();
    return data.filter((item) => item.name.toLowerCase().includes(query));
  }, [data, searchQuery]);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const cmp = aStr.localeCompare(bStr, "es");
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDirection]);

  const handleSort = (columnIndex: number) => {
    if (columnIndex >= dataKeys.length) return;

    const key = dataKeys[columnIndex];
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base md:text-lg font-semibold text-slate-900">{title}</h3>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-auto pl-9 pr-4 py-3 md:py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white placeholder-slate-400"
              />
            </div>
            {/* Mobile sort button */}
            <div className="relative md:hidden">
              <button
                onClick={() => setShowMobileSort(!showMobileSort)}
                className={`flex items-center gap-1.5 px-3 py-3 text-sm border rounded-lg transition-colors ${
                  sortKey
                    ? "border-primary-300 bg-primary-50 text-primary-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <ArrowUpDown className="w-4 h-4" />
                <span className="whitespace-nowrap">
                  {sortKey && sortDirection
                    ? sortDirection === "asc" ? "A-Z" : "Z-A"
                    : "Ordenar"}
                </span>
              </button>
              {showMobileSort && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[200px]">
                  {columns.map((column, idx) => {
                    if (idx >= dataKeys.length) return null;
                    const isActive = sortKey === dataKeys[idx];
                    return (
                      <button
                        key={column}
                        onClick={() => {
                          handleSort(idx);
                          setShowMobileSort(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                          isActive
                            ? "bg-primary-50 text-primary-700"
                            : "text-slate-700 hover:bg-slate-50"
                        } ${idx === 0 ? "rounded-t-lg" : ""} ${
                          idx === Math.min(columns.length, dataKeys.length) - 1
                            ? "rounded-b-lg"
                            : "border-b border-slate-100"
                        }`}
                      >
                        <span>{column}</span>
                        <span className="text-xs text-slate-400">
                          {isActive && sortDirection === "asc"
                            ? "A-Z ↑"
                            : isActive && sortDirection === "desc"
                            ? "Z-A ↓"
                            : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <span className="text-sm text-slate-500 whitespace-nowrap hidden md:inline">
              {isLoading
                ? "Cargando..."
                : `${sortedData?.length || 0} registros`}
            </span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-12">
          <Spinner text="Cargando datos..." size="md" />
        </div>
      )}

      {/* Mobile Card View */}
      {!isLoading && sortedData && sortedData.length > 0 && renderCard && (
        <div className="md:hidden divide-y divide-slate-100">
          {sortedData.map((item) => (
            <div key={item.id}>
              {renderCard(item, onEdit && (!canEdit || canEdit(item)) ? onEdit : undefined, onDelete)}
            </div>
          ))}
        </div>
      )}

      {/* Desktop Table (always) + Mobile Table (only when no renderCard) */}
      {!isLoading && sortedData && sortedData.length > 0 && (
        <div className={`overflow-x-auto ${renderCard ? "hidden md:block" : ""}`}>
          <table className="w-full">
            {/* Table Head */}
            <thead className="bg-slate-50">
              <tr>
                {columns.map((column, columnIndex) => {
                  const isSortable = columnIndex < dataKeys.length;
                  const isActive =
                    isSortable && sortKey === dataKeys[columnIndex];

                  return (
                    <th
                      key={column}
                      className={`px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider text-center ${
                        isSortable
                          ? "cursor-pointer select-none hover:bg-slate-100 transition-colors"
                          : ""
                      }`}
                      onClick={() => isSortable && handleSort(columnIndex)}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{column}</span>
                        {isSortable &&
                          (isActive && sortDirection === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : isActive && sortDirection === "desc" ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                          ))}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="bg-white divide-y divide-slate-100">
              {sortedData.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  {dataKeys.map((key) => (
                    <td
                      key={String(key)}
                      className="px-6 py-4 text-center text-sm text-slate-900 uppercase"
                    >
                      {String(item[key] ?? "-")}
                    </td>
                  ))}

                  {(onEdit || onDelete) && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {onEdit && (!canEdit || canEdit(item)) && (
                          <button
                            onClick={() => onEdit(item)}
                            className="p-3 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <SquarePen className="w-5 h-5" />
                          </button>
                        )}
                        {onEdit && canEdit && !canEdit(item) && (
                          <span className="p-3 text-slate-300" title="Restringido">
                            <Lock className="w-5 h-5" />
                          </span>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(item)}
                            className="p-3 text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State - No search results */}
      {!isLoading && data.length > 0 && sortedData.length === 0 && (
        <EmptyState
          icon={<Search className="w-12 h-12" />}
          title="Sin resultados"
          description={`No se encontraron registros para "${searchQuery}"`}
        />
      )}

      {/* Empty State - No data */}
      {!isLoading && (!data || data.length === 0) && (
        <EmptyState
          icon={<Inbox className="w-12 h-12" />}
          title="No hay datos"
          description="No se encontraron registros"
        />
      )}
    </div>
  );
}
