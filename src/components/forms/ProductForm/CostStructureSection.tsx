"use client";

import { ChefHat } from "lucide-react";
import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import type {
  CreateProduct,
  Product,
  ProductComponentLine,
  Recipe,
} from "@/types";
import RecipeSelector from "@/features/productos/components/RecipeSelector";
import BundleSelector from "@/features/productos/components/BundleSelector";

type CostMode = "receta" | "combo";

interface CostStructureSectionProps {
  costMode: CostMode;
  onChangeMode: (mode: CostMode) => void;
  isSubmitting: boolean;
  register: UseFormRegister<CreateProduct>;
  setValue: UseFormSetValue<CreateProduct>;
  // Recipe mode
  recipes: Recipe[];
  selectedRecipeId: number | null;
  initialSearchText: string;
  recipeBatchCost: number;
  recipeYield: number;
  manufacturingCost: number;
  onSelectRecipe: (
    id: number,
    name: string,
    batchCost: number,
    recipeYield: number
  ) => void;
  onClearRecipe: () => void;
  // Combo mode
  products: Product[];
  currentProductId?: number;
  currentCategoryId?: number;
  components: ProductComponentLine[];
  onComponentsChange: (lines: ProductComponentLine[]) => void;
}

export default function CostStructureSection({
  costMode,
  onChangeMode,
  isSubmitting,
  register,
  setValue,
  recipes,
  selectedRecipeId,
  initialSearchText,
  recipeBatchCost,
  recipeYield,
  manufacturingCost,
  onSelectRecipe,
  onClearRecipe,
  products,
  currentProductId,
  currentCategoryId,
  components,
  onComponentsChange,
}: CostStructureSectionProps) {
  return (
    <div className="border-2 border-blue-200 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-white">
      <h3 className="text-base font-semibold text-blue-900 mb-3 flex items-center gap-2">
        <ChefHat className="w-5 h-5" />
        Estructura de Costo
      </h3>

      {/* Selector de modo: receta base vs combo (paquete de productos) */}
      <div className="flex gap-2 mb-3">
        {(
          [
            { mode: "receta" as const, label: "Receta base" },
            { mode: "combo" as const, label: "Combo (paquete)" },
          ]
        ).map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChangeMode(mode)}
            disabled={isSubmitting}
            className={`flex-1 px-3 py-2 min-h-[40px] rounded-lg text-sm font-medium border transition-all ${
              costMode === mode
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {costMode === "receta" ? (
        <RecipeSelector
          recipes={recipes}
          selectedRecipeId={selectedRecipeId}
          initialSearchText={initialSearchText}
          recipeBatchCost={recipeBatchCost}
          recipeYield={recipeYield}
          manufacturingCost={manufacturingCost}
          register={register}
          setValue={setValue}
          isSubmitting={isSubmitting}
          onSelectRecipe={onSelectRecipe}
          onClearRecipe={onClearRecipe}
        />
      ) : (
        <BundleSelector
          products={products}
          currentProductId={currentProductId}
          currentCategoryId={currentCategoryId}
          components={components}
          onChange={onComponentsChange}
          setValue={setValue}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
