import { SquarePen, Trash2 } from "lucide-react";
import Spinner from "@/components/ui/Spinner";

interface DataTableProps<T> {
  title: string;
  columns: string[];
  dataKeys: (keyof T)[];
  data: T[];
  isLoading?: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

export default function DataTable<T extends { id: number }>({
  title,
  columns,
  dataKeys,
  data,
  isLoading = false,
  onEdit,
  onDelete,
}: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-lg border border-primary-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-primary-200 bg-primary-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary-900">{title}</h3>
          <span className="text-sm text-primary-700">
            {isLoading ? "Cargando..." : `${data?.length || 0} registros`}
          </span>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-12">
          <Spinner text="Cargando datos..." size="md" />
        </div>
      )}

      {/* Table */}
      {!isLoading && data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Head */}
            <thead className="bg-primary-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className={
                      "px-6 py-3 text-xs font-medium text-primary-700 uppercase tracking-wider text-center"
                    }
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="bg-white divide-y divide-primary-200">
              {data.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-primary-50 transition-colors"
                >
                  {/* Datos */}
                  {dataKeys.map((key) => (
                    <td
                      key={String(key)}
                      className="px-6 py-4 text-center text-sm text-primary-900"
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

      {/* Empty State */}
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
