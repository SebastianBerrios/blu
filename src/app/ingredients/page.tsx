"use client";

import { useState } from "react";
import { ChefHat, SquarePen, Trash2 } from "lucide-react";
import { useIngredients } from "@/hooks/useIngredients";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import { deleteWithAudit } from "@/utils/helpers/deleteWithAudit";
import type { Ingredient } from "@/types";
import IngredientForm from "@/components/forms/IngredientForm";
import DataTable from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import FAB from "@/components/ui/FAB";
import { redirect } from "next/navigation";

export default function Ingredients() {
  const { isAdmin, isLoading: authLoading, user, profile } = useAuth();
  const { ingredients, error, isLoading, mutate } = useIngredients();
  const { groups } = useInventory();

  if (!authLoading && !isAdmin) {
    redirect("/");
  }

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedIngredient, setSelectedIngredient] = useState<
    Ingredient | undefined
  >();

  const handleCreate = () => {
    setSelectedIngredient(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setIsModalOpen(true);
  };

  const handleDelete = async (ingredient: Ingredient) => {
    await deleteWithAudit({
      table: "ingredients",
      id: ingredient.id,
      userId: user?.id ?? null,
      userName: profile?.full_name ?? null,
      auditTable: "ingredients",
      description: `Ingrediente: ${ingredient.name}`,
    });
    mutate();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedIngredient(undefined);
  };

  const handleSuccess = () => {
    mutate();
  };

  return (
    <>
      <section className="h-full flex flex-col bg-slate-50">
        <PageHeader
          title="Ingredientes"
          subtitle="Guarda tus ingredientes para crear productos"
          icon={<ChefHat className="w-6 h-6 text-primary-700" />}
          action={
            <Button variant="primary" icon={true} onClick={handleCreate}>
              Agregar ingrediente
            </Button>
          }
        />

        <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                Error al cargar los ingredientes: {error.message}
              </p>
            </div>
          )}
          <DataTable<Ingredient>
            title="Lista de Ingredientes"
            columns={["N°", "Nombre", "Cantidad", "Unidad de Medida", "Precio (S/.)", "Acciones"]}
            dataKeys={["id", "name", "quantity", "unit_of_measure", "price"]}
            data={ingredients || []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            renderCard={(item, onEditFn, onDeleteFn) => (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 capitalize truncate">{item.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-500">{item.quantity} {item.unit_of_measure}</span>
                    <span className="text-sm font-semibold text-primary-700">S/ {item.price}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {onEditFn && (
                    <button onClick={() => onEditFn(item)} className="p-3 text-primary-700 hover:bg-primary-50 rounded-lg">
                      <SquarePen className="w-5 h-5" />
                    </button>
                  )}
                  {onDeleteFn && (
                    <button onClick={() => onDeleteFn(item)} className="p-3 text-red-700 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          />
        </div>
      </section>

      <FAB onClick={handleCreate} label="Agregar ingrediente" />

      <IngredientForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        ingredient={selectedIngredient}
        groups={groups}
      />
    </>
  );
}
