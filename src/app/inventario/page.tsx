"use client";

import { useState } from "react";
import { Package, ShoppingCart, Clock, Settings } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import { adjustInventory, toggleNeedsPurchase } from "@/features/inventario/services/inventoryService";
import type { Ingredient } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import Spinner from "@/components/ui/Spinner";
import StockTab from "@/features/inventario/components/StockTab";
import ComprasTab from "@/features/inventario/components/ComprasTab";
import HistorialTab from "@/features/inventario/components/HistorialTab";
import GroupManager from "@/features/inventario/components/GroupManager";

interface EditingState {
  ingredientId: number;
  value: string;
}

type TabKey = "stock" | "compras" | "historial";

export default function InventarioPage() {
  const { ingredients, movements, groups, isLoading, mutateIngredients, mutateMovements, mutateGroups } = useInventory();
  const { user, profile, isAdmin } = useAuth();
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("stock");
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);

  const purchaseCount = ingredients.filter((i) => i.needs_purchase).length;

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

  const handleTogglePurchase = async (ingredient: Ingredient) => {
    try {
      await toggleNeedsPurchase(ingredient.id, !ingredient.needs_purchase);
      mutateIngredients();
    } catch (err) {
      console.error("Error al cambiar estado de compra:", err);
      setSaveError(err instanceof Error ? err.message : "Error al actualizar");
    }
  };

  const handleGroupsChanged = () => {
    mutateGroups();
    mutateIngredients();
  };

  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "stock", label: "Stock", icon: <Package className="w-4 h-4" /> },
    { key: "compras", label: "Compras", icon: <ShoppingCart className="w-4 h-4" />, badge: purchaseCount },
    { key: "historial", label: "Historial", icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <section className="h-full flex flex-col bg-slate-50">
      <PageHeader
        title="Inventario"
        subtitle="Stock de ingredientes y movimientos"
        icon={<Package className="w-6 h-6 text-primary-700" />}
        action={
          isAdmin ? (
            <button
              onClick={() => setGroupManagerOpen(true)}
              className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Administrar grupos"
            >
              <Settings className="w-5 h-5" />
            </button>
          ) : undefined
        }
      />

      {/* Tab switcher */}
      <div className="px-4 md:px-6 pt-4 shrink-0">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge ? (
                <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-primary-100 text-primary-700 rounded-full">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
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
            groups={groups}
            editing={editing}
            saving={saving}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            onEditChange={(val) => setEditing(editing ? { ...editing, value: val } : null)}
            onTogglePurchase={handleTogglePurchase}
          />
        ) : activeTab === "compras" ? (
          <ComprasTab
            ingredients={ingredients}
            groups={groups}
            onUnmark={handleTogglePurchase}
          />
        ) : (
          <HistorialTab movements={movements} ingredientMap={ingredientMap} />
        )}
      </div>

      {isAdmin && (
        <GroupManager
          isOpen={groupManagerOpen}
          onClose={() => setGroupManagerOpen(false)}
          groups={groups}
          userId={user?.id ?? null}
          userName={profile?.full_name ?? null}
          onSuccess={handleGroupsChanged}
        />
      )}
    </section>
  );
}
