"use client";

import { useState, useMemo } from "react";
import { ShoppingBasket, SquarePen, Trash2, BookOpen, Lock } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useRecipes } from "@/hooks/useRecipes";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/hooks/useAuth";
import { deleteWithAudit } from "@/utils/helpers/deleteWithAudit";
import type { Product, Recipe } from "@/types";
import ProductForm from "@/components/forms/ProductForm";
import RecipeForm from "@/components/forms/RecipeForm";
import AvailabilityTab from "@/features/productos/components/AvailabilityTab";
import DataTable from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import FAB from "@/components/ui/FAB";

export default function Products() {
  const { products, error, isLoading, mutate } = useProducts();
  const { recipes, mutate: mutateRecipes } = useRecipes();
  const { categories } = useCategories();
  const { isAdmin, user, profile } = useAuth();

  const RESTRICTED_CATEGORY_NAMES = useMemo(() => new Set([
    "cookies", "brownies", "muffins", "tartaletas",
    "cuchareables", "alfajores", "tortas y cakes",
  ]), []);

  const restrictedCategoryIds = useMemo(() => {
    return new Set(
      categories
        .filter((c) => RESTRICTED_CATEGORY_NAMES.has(c.name.toLowerCase()))
        .map((c) => c.id)
    );
  }, [categories, RESTRICTED_CATEGORY_NAMES]);

  const canEditRecipe = (product: Product) =>
    !product.category_id || !restrictedCategoryIds.has(product.category_id);
  const [activeTab, setActiveTab] = useState<"productos" | "disponibilidad">("productos");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();

  // Recipe modal state for non-admins
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [selectedProductForRecipe, setSelectedProductForRecipe] = useState<Product | undefined>();
  const [selectedRecipeForEdit, setSelectedRecipeForEdit] = useState<Recipe | undefined>();

  const handleCreate = () => {
    setSelectedProduct(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (product: Product) => {
    await deleteWithAudit({
      table: "products",
      id: product.id,
      userId: user?.id ?? null,
      userName: profile?.full_name ?? null,
      auditTable: "products",
      description: `Producto: ${product.name}`,
    });
    mutate();
  };

  const handleEditRecipe = (product: Product) => {
    setSelectedProductForRecipe(product);
    const foundRecipe = product.recipe_id
      ? recipes.find((r) => r.id === product.recipe_id)
      : undefined;
    setSelectedRecipeForEdit(foundRecipe);
    setIsRecipeModalOpen(true);
  };

  const handleCloseRecipeModal = () => {
    setIsRecipeModalOpen(false);
    setSelectedProductForRecipe(undefined);
    setSelectedRecipeForEdit(undefined);
  };

  const handleRecipeSuccess = () => {
    mutate();
    mutateRecipes();
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
    : ["N°", "Producto", "Precio Venta", "Receta"];

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
            isAdmin && activeTab === "productos" ? (
              <Button variant="primary" icon={true} onClick={handleCreate}>
                Agregar producto
              </Button>
            ) : undefined
          }
        />

        {/* Tab switcher */}
        <div className="px-4 md:px-6 pt-4 shrink-0">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab("productos")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "productos"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Productos
            </button>
            <button
              onClick={() => setActiveTab("disponibilidad")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "disponibilidad"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Disponibilidad
            </button>
          </div>
        </div>

        <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                Error al cargar los productos: {error.message}
              </p>
            </div>
          )}
          {activeTab === "disponibilidad" && (
            <AvailabilityTab
              products={products}
              categories={categories}
              isAdmin={isAdmin}
              user={user}
              profile={profile}
              mutate={mutate}
            />
          )}
          {activeTab === "productos" && <DataTable<Product>
            title="Lista de Productos"
            columns={columns}
            dataKeys={dataKeys}
            data={products || []}
            isLoading={isLoading}
            onEdit={isAdmin ? handleEdit : handleEditRecipe}
            onDelete={isAdmin ? handleDelete : undefined}
            canEdit={isAdmin ? undefined : canEditRecipe}
            renderExtraActions={isAdmin ? (item) => (
              <button
                onClick={() => handleEditRecipe(item)}
                className={`p-3 rounded-lg transition-colors ${
                  item.recipe_id
                    ? "text-green-700 hover:bg-green-100"
                    : "text-amber-700 hover:bg-amber-100"
                }`}
                title={item.recipe_id ? "Ver receta" : "Crear receta"}
              >
                <BookOpen className="w-5 h-5" />
              </button>
            ) : undefined}
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
                {(onEditFn || onDeleteFn || !isAdmin) && (
                  <div className="flex items-center gap-1 shrink-0">
                    {onEditFn && (
                      <button onClick={() => onEditFn(item)} className="p-3 text-primary-700 hover:bg-primary-50 rounded-lg">
                        {isAdmin ? <SquarePen className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleEditRecipe(item)}
                        className={`p-3 rounded-lg transition-colors ${
                          item.recipe_id
                            ? "text-green-700 hover:bg-green-100"
                            : "text-amber-700 hover:bg-amber-100"
                        }`}
                        title={item.recipe_id ? "Ver receta" : "Crear receta"}
                      >
                        <BookOpen className="w-5 h-5" />
                      </button>
                    )}
                    {!onEditFn && !isAdmin && (
                      <span className="p-3 text-slate-300">
                        <Lock className="w-5 h-5" />
                      </span>
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
          />}
        </div>
      </section>

      {isAdmin && activeTab === "productos" && <FAB onClick={handleCreate} label="Agregar producto" />}

      {isAdmin && (
        <ProductForm
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
          product={selectedProduct}
        />
      )}

      <RecipeForm
        isOpen={isRecipeModalOpen}
        onClose={handleCloseRecipeModal}
        onSuccess={handleRecipeSuccess}
        recipe={selectedRecipeForEdit}
        hidePrice={!isAdmin}
        readOnlyMeta={!isAdmin && !!selectedRecipeForEdit}
        productId={selectedProductForRecipe?.id}
      />
    </>
  );
}
