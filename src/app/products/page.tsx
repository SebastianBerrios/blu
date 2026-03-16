"use client";

import { useState } from "react";
import { ShoppingBasket, SquarePen, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/utils/auditLog";
import type { Product } from "@/types";
import ProductForm from "@/components/forms/ProductForm";
import DataTable from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import FAB from "@/components/ui/FAB";

export default function Products() {
  const { products, error, isLoading, mutate } = useProducts();
  const { isAdmin, user, profile } = useAuth();
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
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (!error) {
      logAudit({
        userId: user?.id ?? null,
        userName: profile?.full_name ?? null,
        action: "eliminar",
        targetTable: "products",
        targetId: product.id,
        targetDescription: `Producto: ${product.name}`,
      });
    }
    mutate();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(undefined);
  };

  const handleSuccess = () => {
    mutate();
  };

  const columns = isAdmin
    ? ["N°", "Producto", "Costo de Fabricación", "Precio sugerido", "Precio Venta", "Acciones"]
    : ["N°", "Producto", "Precio Venta"];

  const dataKeys: (keyof Product)[] = isAdmin
    ? ["id", "name", "manufacturing_cost", "suggested_price", "price"]
    : ["id", "name", "price"];

  return (
    <>
      <section className="h-full flex flex-col bg-slate-50">
        <PageHeader
          title="Productos"
          subtitle="Gestiona los productos de tu cafetería"
          icon={<ShoppingBasket className="w-6 h-6 text-primary-700" />}
          action={
            isAdmin ? (
              <Button variant="primary" icon={true} onClick={handleCreate}>
                Agregar producto
              </Button>
            ) : undefined
          }
        />

        <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                Error al cargar los productos: {error.message}
              </p>
            </div>
          )}
          <DataTable<Product>
            title="Lista de Productos"
            columns={columns}
            dataKeys={dataKeys}
            data={products || []}
            isLoading={isLoading}
            onEdit={isAdmin ? handleEdit : undefined}
            onDelete={isAdmin ? handleDelete : undefined}
            renderCard={(item, onEditFn, onDeleteFn) => (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 capitalize truncate">{item.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {isAdmin && item.manufacturing_cost != null && (
                      <span className="text-xs text-slate-500">Costo: S/ {item.manufacturing_cost}</span>
                    )}
                    <span className="text-sm font-semibold text-primary-700">S/ {item.price}</span>
                  </div>
                  {(item.temperatura || item.tipo_leche) && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {item.temperatura && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                          {item.temperatura === "ambos" ? "frío o caliente" : item.temperatura}
                        </span>
                      )}
                      {item.tipo_leche && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                          leche: {item.tipo_leche}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {(onEditFn || onDeleteFn) && (
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
                )}
              </div>
            )}
          />
        </div>
      </section>

      {isAdmin && <FAB onClick={handleCreate} label="Agregar producto" />}

      {isAdmin && (
        <ProductForm
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
          product={selectedProduct}
        />
      )}
    </>
  );
}
