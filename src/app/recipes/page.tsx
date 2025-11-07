"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRecipes } from "@/hooks/useRecipes";
import type { Recipe } from "@/types";
import RecipeForm from "@/components/forms/RecipeForm";
import DataTable from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";

export default function Recipes() {
  const { recipes, error, isLoading, mutate } = useRecipes();

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
    const supabase = createClient();
    await supabase.from("recipes").delete().eq("id", recipe.id);

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
      <section className="h-full flex flex-col bg-primary-50">
        <header className="bg-white border-b border-primary-200 px-6 py-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-xl">
                <BookOpen className="w-6 h-6 text-primary-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary-900">Recetas</h1>
                <p className="text-primary-700 mt-1">Guarda tus recetas.</p>
              </div>
            </div>
            <Button variant="primary" icon={true} onClick={handleCreate}>
              Agregar Receta
            </Button>
          </div>
        </header>

        <div className="flex-1 px-6 py-6 overflow-auto bg-primary-50">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                Error al cargar los recetas: {error.message}
              </p>
            </div>
          )}
          <DataTable<Recipe>
            title="Lista de Recetas"
            columns={[
              "N°",
              "Nombre",
              "Descripción",
              "Cantidad",
              "Unidad de Medida",
              "Costo de Fabricación",
              "Acciones",
            ]}
            dataKeys={[
              "id",
              "name",
              "description",
              "quantity",
              "unit_of_measure",
              "manufacturing_cost",
            ]}
            data={recipes || []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </section>

      <RecipeForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        recipe={selectedRecipe}
      />
    </>
  );
}
