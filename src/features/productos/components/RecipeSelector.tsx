"use client";

import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import type { CreateProduct, Recipe } from "@/types";

interface RecipeSelectorProps {
  recipes: Recipe[];
  selectedRecipeId: number | null;
  initialSearchText: string;
  recipeBatchCost: number;
  recipeYield: number;
  manufacturingCost: number;
  register: UseFormRegister<CreateProduct>;
  setValue: UseFormSetValue<CreateProduct>;
  isSubmitting: boolean;
  onSelectRecipe: (id: number, name: string, batchCost: number, recipeYield: number) => void;
  onClearRecipe: () => void;
}

export default function RecipeSelector({
  recipes,
  selectedRecipeId,
  initialSearchText,
  recipeBatchCost,
  recipeYield,
  manufacturingCost,
  register,
  setValue,
  isSubmitting,
  onSelectRecipe,
  onClearRecipe,
}: RecipeSelectorProps) {
  const [searchRecipe, setSearchRecipe] = useState(initialSearchText);
  const [showRecipeDropdown, setShowRecipeDropdown] = useState(false);

  // Sync search text when parent resets (modal open / edit mode)
  useEffect(() => {
    setSearchRecipe(initialSearchText);
  }, [initialSearchText]);

  // Recalculate unit cost when batch cost or yield changes
  useEffect(() => {
    if (selectedRecipeId && recipeBatchCost > 0) {
      const safeYield = recipeYield > 0 ? recipeYield : 1;
      const unitCost = recipeBatchCost / safeYield;
      setValue("manufacturing_cost", Number(unitCost.toFixed(2)), {
        shouldValidate: true,
      });
    }
  }, [recipeBatchCost, recipeYield, selectedRecipeId, setValue]);

  // Click outside handler
  useEffect(() => {
    if (!showRecipeDropdown) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".recipe-search-container")) {
        setShowRecipeDropdown(false);
      }
    };
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showRecipeDropdown]);

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchRecipe.toLowerCase())
  );

  const handleSelect = (id: number, name: string) => {
    setSearchRecipe(name);
    setShowRecipeDropdown(false);
    const recipe = recipes.find((item) => item.id === id);
    const cost = recipe?.manufacturing_cost ?? 0;
    const quantity = recipe?.quantity ?? 1;
    onSelectRecipe(id, name, cost, quantity);
  };

  const handleClear = () => {
    setSearchRecipe("");
    onClearRecipe();
    setValue("manufacturing_cost", 0, { shouldValidate: true });
  };

  return (
    <>
      {/* Buscador de receta */}
      <div className="relative recipe-search-container mb-3">
        <label className="block text-sm font-medium text-blue-900 mb-1.5">
          Vincular receta base (Opcional)
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchRecipe}
            onChange={(e) => {
              setSearchRecipe(e.target.value);
              setShowRecipeDropdown(true);
            }}
            onFocus={() => setShowRecipeDropdown(true)}
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Buscar receta para calcular costo..."
          />
          {selectedRecipeId && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-3 text-gray-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {showRecipeDropdown && searchRecipe && filteredRecipes.length > 0 && (
          <ul className="absolute z-20 w-full mt-1 bg-white border border-blue-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredRecipes.map((recipe) => (
              <li
                key={recipe.id}
                onClick={() => handleSelect(recipe.id, recipe.name)}
                className="px-4 py-3.5 hover:bg-blue-50 cursor-pointer transition-colors capitalize flex justify-between"
              >
                <span>{recipe.name}</span>
                <span className="text-xs text-blue-600 font-medium">
                  S/ {recipe.manufacturing_cost}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Lógica de Rendimiento (Si hay receta seleccionada) */}
      {selectedRecipeId ? (
        <div className="bg-white border border-blue-200 rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-blue-800">Costo total de receta:</span>
            <span className="font-semibold text-blue-900">
              S/ {recipeBatchCost.toFixed(2)}
            </span>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-blue-700 mb-1">
                Porciones que rinde
              </label>
              <div className="w-full px-3 py-1.5 border border-blue-300 rounded bg-blue-100 text-center font-semibold text-blue-900">
                {recipeYield}
              </div>
            </div>
            <div className="pb-2 text-blue-300">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="flex-1 text-right">
              <span className="block text-xs font-medium text-blue-700 mb-1">
                Costo Unitario
              </span>
              <span className="block text-lg font-bold text-blue-900">
                S/ {manufacturingCost.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Entrada Manual (Si no hay receta) */
        <div>
          <label className="block text-sm font-medium text-blue-900 mb-1.5">
            Costo de fabricación manual (S/)
          </label>
          <input
            type="number"
            step="0.01"
            {...register("manufacturing_cost", {
              min: 0,
              valueAsNumber: true,
            })}
            className="w-full px-4 py-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="0.00"
          />
        </div>
      )}
    </>
  );
}
