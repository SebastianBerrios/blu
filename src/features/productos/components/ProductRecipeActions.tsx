import { BookOpen, Eye } from "lucide-react";
import type { Product } from "@/types";

interface ProductRecipeActionsProps {
  item: Product;
  isAdmin: boolean;
  canEditRecipe: (product: Product) => boolean;
  onViewRecipe: (product: Product) => void;
  onEditRecipe: (product: Product) => void;
}

/**
 * Desktop table extra actions for a product row: view/edit recipe buttons.
 * Presentational only — receives handlers and permission predicates as props.
 */
export default function ProductRecipeActions({
  item,
  isAdmin,
  canEditRecipe,
  onViewRecipe,
  onEditRecipe,
}: ProductRecipeActionsProps) {
  if (!isAdmin && !canEditRecipe(item)) return null;
  return (
    <div className="flex items-center">
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
    </div>
  );
}
