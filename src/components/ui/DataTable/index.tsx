"use client";

import { useState, useMemo } from "react";
import {
  SquarePen,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";

type SortDirection = "asc" | "desc" | null;

interface DataTableProps<T> {
  title: string;
  columns: string[];
  dataKeys: (keyof T)[];
  data: T[];
  isLoading?: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

export default function DataTable<T extends { id: number; name: string }>({
  title,
  columns,
  dataKeys,
  data,
  isLoading = false,
  onEdit,
  onDelete,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

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
    <div className="bg-white rounded-lg border border-primary-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-primary-200 bg-primary-50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-primary-900">{title}</h3>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white placeholder-primary-400"
              />
            </div>
            <span className="text-sm text-primary-700 whitespace-nowrap">
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

      {/* Table */}
      {!isLoading && sortedData && sortedData.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Head */}
            <thead className="bg-primary-50">
              <tr>
                {columns.map((column, columnIndex) => {
                  const isSortable = columnIndex < dataKeys.length;
                  const isActive =
                    isSortable && sortKey === dataKeys[columnIndex];

                  return (
                    <th
                      key={column}
                      className={`px-6 py-3 text-xs font-medium text-primary-700 uppercase tracking-wider text-center ${
                        isSortable
                          ? "cursor-pointer select-none hover:bg-primary-100 transition-colors"
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
                            <ChevronsUpDown className="w-3.5 h-3.5 text-primary-400" />
                          ))}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="bg-white divide-y divide-primary-200">
              {sortedData.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-primary-50 transition-colors"
                >
                  {/* Datos */}
                  {dataKeys.map((key) => (
                    <td
                      key={String(key)}
                      className="px-6 py-4 text-center text-sm text-primary-900 uppercase"
                    >
                      {String(item[key] ?? "-")}
                    </td>
                  ))}

                  {/* Botones de acciones */}
                  {(onEdit || onDelete) && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="p-2 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <SquarePen className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(item)}
                            className="p-2 text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
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
        <div className="text-center py-12 px-6">
          <div className="max-w-sm mx-auto">
            <h3 className="text-lg font-medium text-primary-900 mb-2">
              Sin resultados
            </h3>
            <p className="text-primary-700 mb-6">
              No se encontraron registros para &quot;{searchQuery}&quot;
            </p>
          </div>
        </div>
      )}

      {/* Empty State - No data */}
      {!isLoading && (!data || data.length === 0) && (
        <div className="text-center py-12 px-6">
          <div className="max-w-sm mx-auto">
            <h3 className="text-lg font-medium text-primary-900 mb-2">
              No hay datos
            </h3>
            <p className="text-primary-700 mb-6">No se encontraron registros</p>
          </div>
        </div>
      )}
    </div>
  );
}
