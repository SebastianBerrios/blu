"use client";

import { useState } from "react";
import { FolderOpen, SquarePen, Trash2 } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/hooks/useAuth";
import { deleteWithAudit } from "@/utils/helpers/deleteWithAudit";
import type { Category } from "@/types";
import CategoryForm from "@/components/forms/CategoryForm";
import DataTable from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import FAB from "@/components/ui/FAB";

export default function Categories() {
  const { categories, error, isLoading, mutate } = useCategories();
  const { isAdmin, user, profile } = useAuth();

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
    await deleteWithAudit({
      table: "categories",
      id: category.id,
      userId: user?.id ?? null,
      userName: profile?.full_name ?? null,
      auditTable: "categories",
      description: `Categoría: ${category.name}`,
    });
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
      <section className="h-full flex flex-col bg-slate-50">
        <PageHeader
          title="Categorías"
          subtitle="Gestiona las categorías de tu cafetería"
          icon={<FolderOpen className="w-6 h-6 text-primary-700" />}
          action={
            isAdmin ? (
              <Button variant="primary" icon={true} onClick={handleCreate}>
                Agregar categoría
              </Button>
            ) : undefined
          }
        />

        <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                Error al cargar las categorías: {error.message}
              </p>
            </div>
          )}
          <DataTable<Category>
            title="Lista de Categorías"
            columns={isAdmin ? ["N°", "Categorías", "Acciones"] : ["N°", "Categorías"]}
            dataKeys={["id", "name"]}
            data={categories || []}
            isLoading={isLoading}
            onEdit={isAdmin ? handleEdit : undefined}
            onDelete={isAdmin ? handleDelete : undefined}
            renderCard={(item, onEditFn, onDeleteFn) => (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-xs text-slate-400">#{item.id}</span>
                  <p className="text-sm font-medium text-slate-900 capitalize">{item.name}</p>
                </div>
                {(onEditFn || onDeleteFn) && (
                  <div className="flex items-center gap-1">
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
                )}
              </div>
            )}
          />
        </div>
      </section>

      {isAdmin && <FAB onClick={handleCreate} label="Agregar categoría" />}

      {isAdmin && (
        <CategoryForm
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
          category={selectedCategory}
        />
      )}
    </>
  );
}
