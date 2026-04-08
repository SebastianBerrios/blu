"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import { adjustInventory } from "@/features/inventario/services/inventoryService";
import type { Ingredient } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import Spinner from "@/components/ui/Spinner";
import StockTab from "@/features/inventario/components/StockTab";
import HistorialTab from "@/features/inventario/components/HistorialTab";

interface EditingState {
  ingredientId: number;
  value: string;
}

export default function InventarioPage() {
  const { ingredients, movements, isLoading, mutateIngredients, mutateMovements } = useInventory();
  const { user, profile } = useAuth();
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"stock" | "historial">("stock");

  const handleStartEdit = (ingredient: Ingredient) => {
    setSaveError(null);
    setEditing({ ingredientId: ingredient.id, value: String(ingredient.quantity) });
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setSaveError(null);
  };

  const handleSaveEdit = async (ingredient: Ingredient) => {
    if (!editing) return;
    const newQty = parseFloat(editing.value);
    if (isNaN(newQty) || newQty < 0) return;

    setSaving(true);
    setSaveError(null);
    try {
      await adjustInventory(
        ingredient,
        newQty,
        user?.id ?? null,
        profile?.full_name ?? null,
      );
      setEditing(null);
      mutateIngredients();
      mutateMovements();
    } catch (err) {
      console.error("Error al ajustar inventario:", err);
      setSaveError(err instanceof Error ? err.message : "Error al ajustar inventario");
    } finally {
      setSaving(false);
    }
  };

  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

  return (
    <section className="h-full flex flex-col bg-slate-50">
      <PageHeader
        title="Inventario"
        subtitle="Stock de ingredientes y movimientos"
        icon={<Package className="w-6 h-6 text-primary-700" />}
      />

      {/* Tab switcher */}
      <div className="px-4 md:px-6 pt-4 shrink-0">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab("stock")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "stock"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Stock
          </button>
          <button
            onClick={() => setActiveTab("historial")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "historial"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto">
        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{saveError}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner />
          </div>
        ) : activeTab === "stock" ? (
          <StockTab
            ingredients={ingredients}
            editing={editing}
            saving={saving}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            onEditChange={(val) => setEditing(editing ? { ...editing, value: val } : null)}
          />
        ) : (
          <HistorialTab movements={movements} ingredientMap={ingredientMap} />
        )}
      </div>
    </section>
  );
}
