"use client";

import { useState } from "react";
import { ChefHat } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useIngredients } from "@/hooks/useIngredients";
import type { Ingredient } from "@/types";
import IngredientForm from "@/components/forms/IngredientForm";
import DataTable from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";

export default function Ingredients() {
  const { ingredients, error, isLoading, mutate } = useIngredients();

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
    const supabase = createClient();
    await supabase.from("ingredients").delete().eq("id", ingredient.id);

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
      <section className="h-full flex flex-col bg-primary-50">
        <header className="bg-white border-b border-primary-200 px-6 py-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-xl">
                <ChefHat className="w-6 h-6 text-primary-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary-900">
                  Ingredientes
                </h1>
                <p className="text-primary-700 mt-1">
                  Guarda tus ingredientes para crear productos.
                </p>
              </div>
            </div>
            <Button variant="primary" icon={true} onClick={handleCreate}>
              Agregar ingrediente
            </Button>
          </div>
        </header>

        <div className="flex-1 px-6 py-6 overflow-auto bg-primary-50">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                Error al cargar los ingredientes: {error.message}
              </p>
            </div>
          )}
          <DataTable<Ingredient>
            title="Lista de Ingredientes"
            columns={[
              "N°",
              "Nombre",
              "Cantidad",
              "Unidad de Medida",
              "Precio (S/.)",
              "Acciones",
            ]}
            dataKeys={["id", "name", "quantity", "unit_of_measure", "price"]}
            data={ingredients || []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </section>

      <IngredientForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        ingredient={selectedIngredient}
      />
    </>
  );
}
