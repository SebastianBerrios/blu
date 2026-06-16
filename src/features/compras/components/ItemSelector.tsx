"use client";

import { useState } from "react";
import type { Ingredient, PurchaseItemLine } from "@/types";
import { normalizeText, compatibleUnits } from "@/utils/helpers";

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
  const [itemQuantity, setItemQuantity] = useState("");
  const [itemUnit, setItemUnit] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredIngredients = ingredients.filter((ing) =>
    normalizeText(ing.name).includes(normalizeText(searchText))
  );

  const selectedIngredient = selectedIngredientId
    ? ingredients.find((i) => i.id === selectedIngredientId) ?? null
    : null;

  const unitChoices = selectedIngredient
    ? compatibleUnits(selectedIngredient.unit_of_measure, selectedIngredient.unit_weight_g)
    : [];

  const handleSelectIngredient = (id: number, name: string) => {
    const ing = ingredients.find((i) => i.id === id);
    setSelectedIngredientId(id);
    setSearchText(name);
    setItemUnit(ing?.unit_of_measure ?? "");
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

    let quantity: number | null = null;
    if (itemQuantity.trim() !== "") {
      const parsedQty = parseFloat(itemQuantity);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        setError("Ingresa una cantidad válida");
        return;
      }
      quantity = parsedQty;
    }

    onAdd({
      item_name: trimmed,
      ingredient_id: selectedIngredientId,
      price,
      quantity,
      unit: selectedIngredient ? itemUnit || selectedIngredient.unit_of_measure : null,
    });

    setSearchText("");
    setSelectedIngredientId(null);
    setItemPrice("");
    setItemQuantity("");
    setItemUnit("");
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
            placeholder="Precio total"
          />
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={itemQuantity}
            onChange={(e) => {
              setItemQuantity(e.target.value);
              setError(null);
            }}
            disabled={isSubmitting}
            className="flex-1 w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
            placeholder="Cantidad"
          />
          {selectedIngredient && unitChoices.length > 1 ? (
            <select
              value={itemUnit}
              onChange={(e) => setItemUnit(e.target.value)}
              disabled={isSubmitting}
              className="w-20 px-2 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
            >
              {unitChoices.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          ) : selectedIngredient ? (
            <span className="flex items-center px-3 text-slate-500 text-sm">
              {selectedIngredient.unit_of_measure}
            </span>
          ) : null}
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

      {selectedIngredient && (
        <p className="text-xs text-slate-500">
          La cantidad sumará al stock de{" "}
          <span className="font-medium capitalize">{selectedIngredient.name}</span>{" "}
          (en {selectedIngredient.unit_of_measure}).
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}
