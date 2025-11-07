"use client";

import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import type { Product } from "@/types";
import ProductForm from "@/components/forms/ProductForm";
import DataTable from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";

export default function Products() {
  const { products, error, isLoading, mutate } = useProducts();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();

  const handleCreate = () => {
    setSelectedProduct(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (product: Product) => {
    const supabase = createClient();
    await supabase.from("products").delete().eq("id", product.id);

    mutate();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(undefined);
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
                  Productos
                </h1>
                <p className="text-primary-700 mt-1">
                  Gestiona los productos de tu cafeteria
                </p>
              </div>
            </div>
            <Button variant="primary" icon={true} onClick={handleCreate}>
              Agregar producto
            </Button>
          </div>
        </header>

        <div className="flex-1 px-6 py-6 overflow-auto bg-primary-50">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                Error al cargar los productos: {error.message}
              </p>
            </div>
          )}
          <DataTable<Product>
            title="Lista de Productos"
            columns={["N°", "Producto", "precio", "Acciones"]}
            dataKeys={["id", "name", "price"]}
            data={products || []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </section>

      <ProductForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        product={selectedProduct}
      />
    </>
  );
}
