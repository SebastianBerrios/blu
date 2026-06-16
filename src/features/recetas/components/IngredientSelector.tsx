"use client";

import { useState, useEffect } from "react";
import type { Ingredient } from "@/types";
import type { RecipeIngredientLine } from "../types";
import { calculateIngredientCost } from "../services/recipeCalculations";
import { normalizeText, compatibleUnits, areCompatible } from "@/utils/helpers";

interface IngredientSelectorProps {
  ingredients: Ingredient[];
  recipeIngredients: RecipeIngredientLine[];
  onAdd: (ingredient: RecipeIngredientLine) => void;
  onUpdate: (ingredientId: number, updated: RecipeIngredientLine) => void;
  editingItem: RecipeIngredientLine | null;
  onCancelEdit: () => void;
  isSubmitting: boolean;
}

export default function IngredientSelector({
  ingredients,
  recipeIngredients,
  onAdd,
  onUpdate,
  editingItem,
  onCancelEdit,
  isSubmitting,
}: IngredientSelectorProps) {
  const [searchIngredient, setSearchIngredient] = useState("");
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | null>(null);
  const [ingredientQuantity, setIngredientQuantity] = useState("");
  const [ingredientUnit, setIngredientUnit] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingItem) {
      setSearchIngredient(editingItem.ingredient_name);
      setSelectedIngredientId(editingItem.ingredient_id);
      setIngredientQuantity(String(editingItem.quantity));
      setIngredientUnit(editingItem.unit_of_measure);
      setError(null);
    }
  }, [editingItem]);

  const resetFields = () => {
    setSearchIngredient("");
    setSelectedIngredientId(null);
    setIngredientQuantity("");
    setIngredientUnit("");
    setError(null);
  };

  const filteredIngredients = ingredients.filter((ingredient) =>
    normalizeText(ingredient.name).includes(normalizeText(searchIngredient))
  );

  const selectedIngredient = selectedIngredientId
    ? ingredients.find((ing) => ing.id === selectedIngredientId)
    : null;

  // La unidad de la línea se limita a las compatibles con el ingrediente:
  // peso → kg/g, volumen → l/ml, conteo/personalizada → solo esa unidad.
  // Si el ingrediente tiene peso por unidad, además permite und↔g/kg.
  const unitChoices = selectedIngredient
    ? compatibleUnits(selectedIngredient.unit_of_measure, selectedIngredient.unit_weight_g)
    : [];
  const unitLocked = !!selectedIngredient && unitChoices.length <= 1;

  const handleSelectIngredient = (id: number, name: string) => {
    const ingredient = ingredients.find((ing) => ing.id === id);
    setSelectedIngredientId(id);
    setSearchIngredient(name);
    setShowDropdown(false);
    setError(null);
    if (ingredient) {
      setIngredientUnit(ingredient.unit_of_measure);
    }
  };

  const handleAddIngredient = () => {
    if (!selectedIngredientId || !ingredientQuantity || !ingredientUnit) {
      setError("Por favor completa todos los campos del ingrediente");
      return;
    }

    const ingredient = ingredients.find((ing) => ing.id === selectedIngredientId);
    if (!ingredient) return;

    if (!areCompatible(ingredientUnit, ingredient.unit_of_measure, ingredient.unit_weight_g)) {
      setError(
        `La unidad no es compatible: ${ingredient.name} se mide en ${ingredient.unit_of_measure}`,
      );
      return;
    }

    const equivalentPrice = calculateIngredientCost(
      parseFloat(ingredientQuantity),
      ingredientUnit,
      ingredient.price,
      ingredient.quantity,
      ingredient.unit_of_measure,
      ingredient.unit_weight_g
    );

    const line: RecipeIngredientLine = {
      ingredient_id: selectedIngredientId,
      ingredient_name: ingredient.name,
      quantity: parseFloat(ingredientQuantity),
      unit_of_measure: ingredientUnit,
      ingredient_price: ingredient.price,
      ingredient_unit: ingredient.unit_of_measure,
      ingredient_quantity_stock: ingredient.quantity,
      ingredient_unit_weight_g: ingredient.unit_weight_g,
      equivalent_price: equivalentPrice,
    };

    if (editingItem) {
      onUpdate(editingItem.ingredient_id, line);
    } else {
      const exists = recipeIngredients.some(
        (item) => item.ingredient_id === selectedIngredientId
      );
      if (exists) {
        setError("Este ingrediente ya está agregado a la receta");
        return;
      }
      onAdd(line);
    }

    resetFields();
  };

  const handleCancel = () => {
    resetFields();
    onCancelEdit();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-start">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchIngredient}
            onChange={(e) => {
              setSearchIngredient(e.target.value);
              setShowDropdown(true);
              setError(null);
            }}
            onFocus={() => setShowDropdown(true)}
            disabled={isSubmitting}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            placeholder="Buscar ingrediente..."
          />

          {showDropdown &&
            searchIngredient &&
            filteredIngredients.length > 0 && (
              <ul className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredIngredients.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    onClick={() =>
                      handleSelectIngredient(ingredient.id, ingredient.name)
                    }
                    className="px-4 py-3.5 hover:bg-slate-100 cursor-pointer transition-colors capitalize flex justify-between items-center"
                  >
                    <span>{ingredient.name}</span>
                    <span className="text-xs text-slate-500 font-medium lowercase">
                      ({ingredient.quantity} {ingredient.unit_of_measure})
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </div>

        {selectedIngredient && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center whitespace-nowrap min-w-fit">
            <span className="text-sm font-semibold text-blue-700">
              {selectedIngredient.quantity} {selectedIngredient.unit_of_measure}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-1.5">
            Cantidad <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={ingredientQuantity}
            onChange={(e) => {
              setIngredientQuantity(e.target.value);
              setError(null);
            }}
            disabled={isSubmitting}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
            placeholder="100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900 mb-1.5">
            Unidad <span className="text-red-600">*</span>
          </label>
          <select
            value={ingredientUnit}
            onChange={(e) => {
              setIngredientUnit(e.target.value);
              setError(null);
            }}
            disabled={isSubmitting || !selectedIngredient || unitLocked}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
          >
            {!selectedIngredient && <option value="">Seleccionar</option>}
            {unitChoices.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {selectedIngredient && (
            <p className="text-xs text-slate-500 mt-1">
              {unitLocked
                ? `Se mide en ${selectedIngredient.unit_of_measure}`
                : `Compatible con ${selectedIngredient.unit_of_measure}`}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}

      <button
        type="button"
        onClick={handleAddIngredient}
        disabled={isSubmitting}
        className="w-full bg-primary-900 py-3 min-h-[44px] text-white rounded-lg hover:bg-primary-800 disabled:bg-gray-400 transition-colors font-medium"
      >
        {editingItem ? "Actualizar ingrediente" : "Agregar ingrediente"}
      </button>
      {editingItem && (
        <button
          type="button"
          onClick={handleCancel}
          className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors py-1"
        >
          Cancelar edición
        </button>
      )}
    </div>
  );
}
