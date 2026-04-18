"use client";

import { useState, useMemo } from "react";
import { Package, Check, X, ArrowUpDown, ShoppingCart, Search } from "lucide-react";
import type { Ingredient, IngredientGroup } from "@/types";
import { groupIngredientsByGroup } from "../utils/groupIngredients";

const LOW_STOCK_THRESHOLD = 0.1;

const StockColGroup = () => (
  <colgroup>
    <col />
    <col style={{ width: "140px" }} />
    <col style={{ width: "100px" }} />
    <col style={{ width: "200px" }} />
    <col style={{ width: "140px" }} />
  </colgroup>
);

function getStockColor(quantity: number, unit: string) {
  const thresholds: Record<string, number> = {
    kg: 0.5,
    g: 200,
    l: 0.5,
    ml: 200,
    und: 5,
    unidad: 5,
  };
  const threshold = thresholds[unit.toLowerCase()] ?? LOW_STOCK_THRESHOLD;
  if (quantity <= 0) return "text-red-600 bg-red-50 border-red-200";
  if (quantity <= threshold) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-emerald-600 bg-emerald-50 border-emerald-200";
}

interface EditingState {
  ingredientId: number;
  value: string;
}

interface StockTabProps {
  ingredients: Ingredient[];
  groups: IngredientGroup[];
  editing: EditingState | null;
  saving: boolean;
  onStartEdit: (i: Ingredient) => void;
  onCancelEdit: () => void;
  onSaveEdit: (i: Ingredient) => void;
  onEditChange: (val: string) => void;
  onTogglePurchase: (ingredient: Ingredient) => void;
  onChangeGroup: (ingredient: Ingredient, groupId: number | null) => void;
}

export default function StockTab({
  ingredients,
  groups,
  editing,
  saving,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditChange,
  onTogglePurchase,
  onChangeGroup,
}: StockTabProps) {
  const [sortOrder, setSortOrder] = useState<"none" | "asc" | "desc">("none");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredIngredients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(query));
  }, [ingredients, searchQuery]);

  const sortIngredients = (items: Ingredient[]) => {
    if (sortOrder === "none") return items;
    return [...items].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "es");
      return sortOrder === "asc" ? cmp : -cmp;
    });
  };

  const grouped = useMemo(
    () => groupIngredientsByGroup(filteredIngredients, groups),
    [filteredIngredients, groups],
  );

  const hasGroups = groups.length > 0;
  const hasSearchQuery = searchQuery.trim().length > 0;
  const noSearchResults = hasSearchQuery && filteredIngredients.length === 0;

  const cycleSortOrder = () => {
    setSortOrder((prev) =>
      prev === "none" ? "asc" : prev === "asc" ? "desc" : "none"
    );
  };

  if (ingredients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400">
        <Package className="w-10 h-10 mb-2" />
        <p className="text-sm">No hay ingredientes registrados</p>
      </div>
    );
  }

  const renderDesktopRow = (ingredient: Ingredient) => {
    const isEditing = editing?.ingredientId === ingredient.id;
    const colorClass = getStockColor(ingredient.quantity, ingredient.unit_of_measure);

    return (
      <tr key={ingredient.id} className="hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3 font-medium text-slate-900 capitalize truncate">
          {ingredient.name}
        </td>
        <td className="px-4 py-3 text-right">
          {isEditing ? (
            <input
              type="number"
              step="0.01"
              min="0"
              value={editing.value}
              onChange={(e) => onEditChange(e.target.value)}
              autoFocus
              className="w-28 px-2 py-1 border-2 border-primary-400 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          ) : (
            <span className={`inline-block px-2 py-0.5 rounded border text-sm font-semibold ${colorClass}`}>
              {ingredient.quantity}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-slate-500">{ingredient.unit_of_measure}</td>
        <td className="px-4 py-3">
          <select
            value={ingredient.group_id ?? ""}
            onChange={(e) => onChangeGroup(ingredient, e.target.value ? Number(e.target.value) : null)}
            className="text-sm text-slate-600 bg-transparent border-0 cursor-pointer focus:ring-2 focus:ring-primary-500 rounded"
          >
            <option value="">Sin grupo</option>
            {groups.sort((a, b) => a.name.localeCompare(b.name, "es")).map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {isEditing ? (
              <>
                <button
                  onClick={() => onSaveEdit(ingredient)}
                  disabled={saving}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50"
                  title="Confirmar"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={onCancelEdit}
                  disabled={saving}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onTogglePurchase(ingredient)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    ingredient.needs_purchase
                      ? "text-primary-600 bg-primary-50 hover:bg-primary-100"
                      : "text-slate-400 hover:text-primary-600 hover:bg-primary-50"
                  }`}
                  title={ingredient.needs_purchase ? "Quitar de compras" : "Agregar a compras"}
                >
                  <ShoppingCart className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onStartEdit(ingredient)}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium px-2 py-1 hover:bg-primary-50 rounded"
                >
                  Ajustar
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const renderMobileCard = (ingredient: Ingredient) => {
    const isEditing = editing?.ingredientId === ingredient.id;
    const colorClass = getStockColor(ingredient.quantity, ingredient.unit_of_measure);

    return (
      <div
        key={ingredient.id}
        className="bg-white rounded-xl border border-slate-200 px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => onTogglePurchase(ingredient)}
              className={`shrink-0 p-1 rounded transition-colors ${
                ingredient.needs_purchase
                  ? "text-primary-600"
                  : "text-slate-300"
              }`}
              title={ingredient.needs_purchase ? "Quitar de compras" : "Agregar a compras"}
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="font-medium text-slate-900 capitalize truncate">{ingredient.name}</p>
              <select
                value={ingredient.group_id ?? ""}
                onChange={(e) => onChangeGroup(ingredient, e.target.value ? Number(e.target.value) : null)}
                className="text-xs text-slate-500 bg-transparent border-0 cursor-pointer focus:ring-2 focus:ring-primary-500 rounded p-0"
              >
                <option value="">Sin grupo</option>
                {groups.sort((a, b) => a.name.localeCompare(b.name, "es")).map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={editing.value}
                onChange={(e) => onEditChange(e.target.value)}
                autoFocus
                className="w-24 px-2 py-1 border-2 border-primary-400 rounded-lg text-right focus:outline-none"
              />
              <button
                onClick={() => onSaveEdit(ingredient)}
                disabled={saving}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={onCancelEdit}
                disabled={saving}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`inline-block px-2 py-0.5 rounded border text-sm font-semibold ${colorClass}`}>
                {ingredient.quantity} {ingredient.unit_of_measure}
              </span>
              <button
                onClick={() => onStartEdit(ingredient)}
                className="text-xs text-primary-600 hover:text-primary-800 font-medium px-2 py-1 hover:bg-primary-50 rounded"
              >
                Ajustar
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Toolbar: search + mobile sort */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ingrediente..."
            className="w-full pl-9 pr-4 py-3 md:py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
        </div>
        <button
          onClick={cycleSortOrder}
          className={`md:hidden shrink-0 flex items-center gap-1.5 px-3 py-3 text-sm border rounded-lg transition-colors ${
            sortOrder !== "none"
              ? "border-primary-300 bg-primary-50 text-primary-700"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          <ArrowUpDown className="w-4 h-4" />
          <span>
            {sortOrder === "asc" ? "A-Z" : sortOrder === "desc" ? "Z-A" : "Ordenar"}
          </span>
        </button>
      </div>

      {noSearchResults ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
          <Search className="w-10 h-10 mb-2" />
          <p className="text-sm">No se encontraron ingredientes</p>
        </div>
      ) : hasGroups ? (
        <>
          {/* Desktop grouped */}
          <div className="hidden md:block space-y-4">
            {grouped.map((section) => (
              <div key={section.group?.id ?? "ungrouped"} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700">
                    {section.group?.name ?? "Sin grupo"}
                  </h3>
                </div>
                <table className="w-full text-sm table-fixed">
                  <StockColGroup />
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Ingrediente</th>
                      <th className="text-right px-4 py-2 font-medium text-slate-500 text-xs">Cantidad</th>
                      <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Unidad</th>
                      <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Grupo</th>
                      <th className="text-right px-4 py-2 font-medium text-slate-500 text-xs">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortIngredients(section.ingredients).map(renderDesktopRow)}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Mobile grouped */}
          <div className="md:hidden space-y-4">
            {grouped.map((section) => (
              <div key={section.group?.id ?? "ungrouped"}>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  {section.group?.name ?? "Sin grupo"}
                </h3>
                <div className="space-y-2">
                  {sortIngredients(section.ingredients).map(renderMobileCard)}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Desktop flat table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm table-fixed">
              <StockColGroup />
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Ingrediente</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Cantidad</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Unidad</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Grupo</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIngredients.map(renderDesktopRow)}
              </tbody>
            </table>
          </div>

          {/* Mobile flat cards */}
          <div className="md:hidden space-y-2">
            {sortIngredients(filteredIngredients).map(renderMobileCard)}
          </div>
        </>
      )}
    </>
  );
}
