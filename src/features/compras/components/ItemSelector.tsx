"use client";

import { useState } from "react";
import type { Ingredient, PurchaseItemLine } from "@/types";

interface ItemSelectorProps {
  ingredients: Ingredient[];
  onAdd: (item: PurchaseItemLine) => void;
  isSubmitting: boolean;
}

export default function ItemSelector({
  ingredients,
  onAdd,
  isSubmitting,
}: ItemSelectorProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | null>(null);
  const [itemPrice, setItemPrice] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredIngredients = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelectIngredient = (id: number, name: string) => {
    setSelectedIngredientId(id);
    setSearchText(name);
    setShowDropdown(false);
    setError(null);
  };

  const handleAddItem = () => {
    const trimmed = searchText.trim();
    if (!trimmed) {
      setError("Escribe el nombre del ítem");
      return;
    }
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price <= 0) {
      setError("Ingresa un precio válido");
      return;
    }

    onAdd({
      item_name: trimmed,
      ingredient_id: selectedIngredientId,
      price,
    });

    setSearchText("");
    setSelectedIngredientId(null);
    setItemPrice("");
    setError(null);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setSelectedIngredientId(null);
            setShowDropdown(true);
            setError(null);
          }}
          onFocus={() => setShowDropdown(true)}
          disabled={isSubmitting}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
          placeholder="Nombre del ítem..."
        />

        {showDropdown &&
          searchText &&
          !selectedIngredientId &&
          filteredIngredients.length > 0 && (
            <ul className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredIngredients.map((ing) => (
                <li
                  key={ing.id}
                  onClick={() => handleSelectIngredient(ing.id, ing.name)}
                  className="px-4 py-3.5 hover:bg-primary-100 cursor-pointer transition-colors capitalize flex justify-between items-center"
                >
                  <span>{ing.name}</span>
                  <span className="text-xs text-slate-500">Ingrediente</span>
                </li>
              ))}
            </ul>
          )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
            S/
          </span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={itemPrice}
            onChange={(e) => {
              setItemPrice(e.target.value);
              setError(null);
            }}
            disabled={isSubmitting}
            className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
            placeholder="Precio"
          />
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          disabled={isSubmitting}
          className="px-6 py-3 bg-primary-900 text-white rounded-lg hover:bg-primary-800 disabled:bg-gray-400 transition-colors font-medium"
        >
          Agregar
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}
