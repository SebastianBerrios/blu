"use client";

import { useState, useMemo } from "react";
import { Package, ArrowUpDown, Search } from "lucide-react";
import type { Ingredient, IngredientGroup } from "@/types";
import { normalizeText } from "@/utils/helpers";
import { groupIngredientsByGroup } from "../utils/groupIngredients";
import { StockColGroup } from "./stockHelpers";
import StockDesktopRow from "./StockDesktopRow";
import StockMobileCard from "./StockMobileCard";

interface EditingState {
  ingredientId: number;
  value: string;
}

interface StockTabProps {
  isAdmin: boolean;
  canAdjust: boolean;
  canDiscard: boolean;
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
  onDiscard: (ingredient: Ingredient) => void;
}

export default function StockTab({
  isAdmin,
  canAdjust,
  canDiscard,
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
  onDiscard,
}: StockTabProps) {
  const [sortOrder, setSortOrder] = useState<"none" | "asc" | "desc">("none");
  const [searchQuery, setSearchQuery] = useState("");

  // Incluye insumos y productos intermedios (producibles). Los intermedios se
  // distinguen con un badge y no muestran el botón de compra (se producen, no se compran).
  const visibleIngredients = useMemo(() => ingredients, [ingredients]);

  const filteredIngredients = useMemo(() => {
    const query = normalizeText(searchQuery);
    if (!query) return visibleIngredients;
    return visibleIngredients.filter((i) => normalizeText(i.name).includes(query));
  }, [visibleIngredients, searchQuery]);

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

  if (visibleIngredients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400">
        <Package className="w-10 h-10 mb-2" />
        <p className="text-sm">No hay ingredientes registrados</p>
      </div>
    );
  }

  const rowProps = {
    isAdmin,
    canAdjust,
    canDiscard,
    editing,
    saving,
    groups,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onEditChange,
    onTogglePurchase,
    onChangeGroup,
    onDiscard,
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
      ) : isAdmin && hasGroups ? (
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
                  <StockColGroup showGroup={isAdmin} />
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Ingrediente</th>
                      <th className="text-right px-4 py-2 font-medium text-slate-500 text-xs">Cantidad</th>
                      <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Unidad</th>
                      {isAdmin && <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Grupo</th>}
                      <th className="text-right px-4 py-2 font-medium text-slate-500 text-xs">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortIngredients(section.ingredients).map((i) => (
                      <StockDesktopRow key={i.id} ingredient={i} {...rowProps} />
                    ))}
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
                  {sortIngredients(section.ingredients).map((i) => (
                    <StockMobileCard key={i.id} ingredient={i} {...rowProps} />
                  ))}
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
              <StockColGroup showGroup={isAdmin} />
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Ingrediente</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Cantidad</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Unidad</th>
                  {isAdmin && <th className="text-left px-4 py-3 font-medium text-slate-600">Grupo</th>}
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIngredients.map((i) => (
                  <StockDesktopRow key={i.id} ingredient={i} {...rowProps} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile flat cards */}
          <div className="md:hidden space-y-2">
            {sortIngredients(filteredIngredients).map((i) => (
              <StockMobileCard key={i.id} ingredient={i} {...rowProps} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
