"use client";

import { useState } from "react";
import { BookOpen, SquarePen, Trash2 } from "lucide-react";
import { useRecipes } from "@/hooks/useRecipes";
import { useAuth } from "@/hooks/useAuth";
import { deleteWithAudit } from "@/utils/helpers/deleteWithAudit";
import type { Recipe } from "@/types";
import RecipeForm from "@/components/forms/RecipeForm";
import DataTable from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import FAB from "@/components/ui/FAB";
import { redirect } from "next/navigation";

export default function Recipes() {
  const { isAdmin, isLoading: authLoading, user, profile } = useAuth();
  const { recipes, error, isLoading, mutate } = useRecipes();

  if (!authLoading && !isAdmin) {
    redirect("/");
  }

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | undefined>();

  const handleCreate = () => {
    setSelectedRecipe(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
  };

  const handleDelete = async (recipe: Recipe) => {
    await deleteWithAudit({
      table: "recipes",
      id: recipe.id,
      userId: user?.id ?? null,
      userName: profile?.full_name ?? null,
      auditTable: "recipes",
      description: `Receta: ${recipe.name}`,
    });
    mutate();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRecipe(undefined);
  };

  const handleSuccess = () => {
    mutate();
  };

  return (
    <>
      <section className="h-full flex flex-col bg-slate-50">
        <PageHeader
          title="Recetas"
          subtitle="Guarda tus recetas"
          icon={<BookOpen className="w-6 h-6 text-primary-700" />}
          action={
            <Button variant="primary" icon={true} onClick={handleCreate}>
              Agregar Receta
            </Button>
          }
        />

        <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                Error al cargar los recetas: {error.message}
              </p>
            </div>
          )}
          <DataTable<Recipe>
            title="Lista de Recetas"
            columns={["N°", "Nombre", "Descripción", "Cantidad", "Unidad de Medida", "Costo de Fabricación", "Acciones"]}
            dataKeys={["id", "name", "description", "quantity", "unit_of_measure", "manufacturing_cost"]}
            data={recipes || []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            renderCard={(item, onEditFn, onDeleteFn) => (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 capitalize truncate">{item.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-500">{item.quantity} {item.unit_of_measure}</span>
                    <span className="text-sm font-semibold text-primary-700">S/ {item.manufacturing_cost}</span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{item.description}</p>
                  )}
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

      <FAB onClick={handleCreate} label="Agregar receta" />

      <RecipeForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        recipe={selectedRecipe}
      />
    </>
  );
}
