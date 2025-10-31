"use client";

import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useCategories } from "@/hooks/useCategories";
import type { Category } from "@/types";
import CategoryForm from "@/components/forms/CategoryForm";
import DataTable from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";

export default function Categories() {
  const { categories, error, isLoading, mutate } = useCategories();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<
    Category | undefined
  >();

  const handleCreate = () => {
    setSelectedCategory(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleDelete = async (category: Category) => {
    const supabase = createClient();
    await supabase.from("categories").delete().eq("id", category.id);

    mutate();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(undefined);
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
                <FolderOpen className="w-6 h-6 text-primary-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary-900">
                  Categorías
                </h1>
                <p className="text-primary-700 mt-1">
                  Gestiona las categorías de tu cafeteria
                </p>
              </div>
            </div>
            <Button variant="primary" icon={true} onClick={handleCreate}>
              Agregar categoría
            </Button>
          </div>
        </header>

        <div className="flex-1 px-6 py-6 overflow-auto bg-primary-50">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                Error al cargar las categorías: {error.message}
              </p>
            </div>
          )}
          <DataTable<Category>
            title="Lista de Categorías"
            columns={["N°", "Categorías", "Acciones"]}
            dataKeys={["id", "name"]}
            data={categories || []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </section>

      <CategoryForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        category={selectedCategory}
      />
    </>
  );
}
