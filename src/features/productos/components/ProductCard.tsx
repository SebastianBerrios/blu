import { SquarePen, Trash2, BookOpen, Eye } from "lucide-react";
import Badge from "@/components/ui/Badge";
import type { Product } from "@/types";

interface ProductCardProps {
  item: Product;
  onEditFn?: (item: Product) => void;
  onDeleteFn?: (item: Product) => void;
  isAdmin: boolean;
  canViewProductCost: boolean;
  canEditRecipe: (product: Product) => boolean;
  onViewRecipe: (product: Product) => void;
  onEditRecipe: (product: Product) => void;
}

/**
 * Mobile card view for a product row in the products DataTable.
 * Presentational only — receives handlers and permission predicates as props.
 */
export default function ProductCard({
  item,
  onEditFn,
  onDeleteFn,
  isAdmin,
  canViewProductCost,
  canEditRecipe,
  onViewRecipe,
  onEditRecipe,
}: ProductCardProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 capitalize truncate">{item.name}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {canViewProductCost && item.manufacturing_cost != null && (
            <span className="text-xs text-slate-500">Costo: S/ {item.manufacturing_cost}</span>
          )}
          <span className="text-sm font-semibold text-primary-700">S/ {item.price}</span>
        </div>
        {(item.temperatura || item.tipo_leche) && (
          <div className="flex items-center gap-1.5 mt-1">
            {item.temperatura && (
              <Badge tone={item.temperatura === "caliente" ? "tempCaliente" : item.temperatura === "frío" ? "tempFrio" : "neutral"} size="sm">
                {item.temperatura === "ambos" ? "frío o caliente" : item.temperatura}
              </Badge>
            )}
            {item.tipo_leche && (
              <Badge tone="milkType" size="sm">
                leche: {item.tipo_leche}
              </Badge>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {onEditFn && (
          <button
            onClick={() => onEditFn(item)}
            className="p-3 text-primary-700 hover:bg-primary-50 rounded-lg"
            title="Editar producto"
          >
            <SquarePen className="w-5 h-5" />
          </button>
        )}
        {(isAdmin || canEditRecipe(item)) && (
          <>
            <button
              onClick={() => onViewRecipe(item)}
              className="p-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              title="Ver receta"
            >
              <Eye className="w-5 h-5" />
            </button>
            <button
              onClick={() => onEditRecipe(item)}
              className={`p-3 rounded-lg transition-colors ${
                item.recipe_id
                  ? "text-green-700 hover:bg-green-100"
                  : "text-amber-700 hover:bg-amber-100"
              }`}
              title={item.recipe_id ? "Editar receta" : "Crear receta"}
            >
              <BookOpen className="w-5 h-5" />
            </button>
          </>
        )}
        {onDeleteFn && (
          <button
            onClick={() => onDeleteFn(item)}
            className="p-3 text-red-700 hover:bg-red-50 rounded-lg"
            title="Eliminar producto"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
