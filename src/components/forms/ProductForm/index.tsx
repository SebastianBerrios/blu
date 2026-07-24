"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import type { CreateProduct, Product, ProductComponentLine } from "@/types";
import { useCategories } from "@/hooks/useCategories";
import { useRecipes } from "@/hooks/useRecipes";
import { useProducts } from "@/hooks/useProducts";
import {
  buildProductPayload,
  createProduct,
  updateProduct,
} from "@/features/productos/services/productsService";
import {
  loadProductComponents,
  saveProductComponents,
} from "@/features/productos/services/bundleService";
import ProductBasicInfoSection from "@/features/productos/components/ProductBasicInfoSection";
import PricingSection from "@/features/productos/components/PricingSection";
import ProductFormHeader from "./ProductFormHeader";
import CostStructureSection from "./CostStructureSection";
import ProductFormFooter from "./ProductFormFooter";
import ProductFormMobileSubmit from "./ProductFormMobileSubmit";

type CostMode = "receta" | "combo";

// Margen por defecto cuando la categoría no tiene `target_margin` configurado.
const DEFAULT_TARGET_MARGIN = 30;

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product;
}

export default function ProductForm({
  isOpen,
  onClose,
  onSuccess,
  product,
}: ProductFormProps) {
  const isEditMode = !!product;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Recipe linking state
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [initialSearchText, setInitialSearchText] = useState("");
  const [recipeBatchCost, setRecipeBatchCost] = useState<number>(0);
  const [recipeYield, setRecipeYield] = useState<number>(1);

  // Modo de costo: receta base vs combo (paquete de productos)
  const [costMode, setCostMode] = useState<CostMode>("receta");
  const [components, setComponents] = useState<ProductComponentLine[]>([]);

  const { categories } = useCategories();
  const { recipes } = useRecipes();
  const { products } = useProducts();

  const { register, handleSubmit, reset, setValue, watch } =
    useForm<CreateProduct>({
      defaultValues: {
        manufacturing_cost: 0,
      },
    });

  const manufacturingCost = Number(watch("manufacturing_cost") || 0);
  const priceValue = Number(watch("price") || 0);

  // El margen objetivo se deriva de la categoría seleccionada (config en BD).
  const selectedCategoryId = Number(watch("categoryId") || 0);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const currentTargetPercentage =
    selectedCategory?.target_margin ?? DEFAULT_TARGET_MARGIN;

  const baseCost = manufacturingCost;
  const wasteCost = Number((baseCost * 0.05).toFixed(2));
  const totalCost = Number((baseCost + wasteCost).toFixed(2));
  const targetPercentageDecimal = currentTargetPercentage / 100;

  const suggestedPrice = Number(
    targetPercentageDecimal && totalCost
      ? (totalCost / targetPercentageDecimal).toFixed(2)
      : 0
  );

  const profit = Number((priceValue - totalCost).toFixed(2));

  useEffect(() => {
    if (isOpen) {
      if (product) {
        reset({
          name: product.name,
          categoryId: product.category_id ?? undefined,
          manufacturing_cost: product.manufacturing_cost ?? 0,
          price: product.price,
          rappi_price: product.rappi_price ?? undefined,
          temperatura: product.temperatura ?? "",
          tipo_leche: product.tipo_leche ?? "",
        });

        if (product.recipe_id) {
          const linked = recipes.find((r) => r.id === product.recipe_id);
          if (linked) {
            setSelectedRecipeId(linked.id);
            setInitialSearchText(linked.name);
            setRecipeBatchCost(linked.manufacturing_cost ?? 0);
            setRecipeYield(linked.quantity ?? 1);
          } else {
            setSelectedRecipeId(null);
            setInitialSearchText("");
            setRecipeBatchCost(0);
            setRecipeYield(1);
          }
        } else {
          setSelectedRecipeId(null);
          setInitialSearchText("");
          setRecipeBatchCost(0);
          setRecipeYield(1);
        }
      } else {
        reset({
          name: "",
          categoryId: undefined,
          manufacturing_cost: 0,
          price: 0,
          rappi_price: undefined,
          temperatura: "",
          tipo_leche: "",
        });
        setSelectedRecipeId(null);
        setInitialSearchText("");
        setRecipeBatchCost(0);
        setRecipeYield(1);
      }
      // El modo combo se resuelve al cargar los componentes (efecto de abajo).
      setCostMode("receta");
      setComponents([]);
    }
  }, [isOpen, product, recipes, reset]);

  // Carga los componentes del combo (si los tiene) al abrir en modo edición.
  useEffect(() => {
    if (!isOpen || !product?.id) return;
    let cancelled = false;
    loadProductComponents(product.id)
      .then((lines) => {
        if (cancelled || lines.length === 0) return;
        setComponents(lines);
        setCostMode("combo");
      })
      .catch((err) => console.error("Error al cargar componentes:", err));
    return () => {
      cancelled = true;
    };
  }, [isOpen, product?.id]);

  if (!isOpen) return null;

  const handleSelectRecipe = (
    id: number,
    _name: string,
    batchCost: number,
    yieldQty: number
  ) => {
    setSelectedRecipeId(id);
    setRecipeBatchCost(batchCost);
    setRecipeYield(yieldQty);
  };

  const handleClearRecipe = () => {
    setSelectedRecipeId(null);
    setRecipeBatchCost(0);
    setRecipeYield(1);
  };

  const handleApplySuggestedPrice = () => {
    setValue("price", Number(suggestedPrice.toFixed(2)), {
      shouldValidate: true,
    });
  };

  const handleApplySuggestedRappiPrice = () => {
    const suggested = Number((priceValue * 1.3).toFixed(2));
    setValue("rappi_price", suggested, { shouldValidate: true });
  };

  const onSubmit: SubmitHandler<CreateProduct> = async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const isCombo = costMode === "combo";
      if (isCombo && components.length === 0) {
        throw new Error("Agrega al menos un producto al combo");
      }
      // En combo no hay receta; el costo es la suma de los componentes.
      const recipeIdToSave = isCombo ? null : selectedRecipeId;
      const payload = buildProductPayload(data, suggestedPrice, recipeIdToSave);

      let productId: number;
      if (isEditMode) {
        await updateProduct(product.id, payload);
        productId = product.id;
        toast.success("Producto actualizado");
      } else {
        productId = await createProduct(payload);
        toast.success("Producto guardado");
      }

      // Sincroniza la composición del combo: guarda los componentes en modo combo,
      // o limpia cualquier resto si el producto pasó a modo receta.
      await saveProductComponents(productId, isCombo ? components : []);

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al guardar producto:", error);
      const msg = error instanceof Error ? error.message : "Error al guardar producto";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitLabel = isSubmitting ? "Guardando..." : isEditMode ? "Actualizar" : "Guardar";

  return (
    <>
      {/* Desktop backdrop */}
      <div
        className="hidden md:block fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Unified container */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[90vh] md:rounded-xl md:shadow-2xl">
        <ProductFormHeader
          isEditMode={isEditMode}
          isSubmitting={isSubmitting}
          onClose={onClose}
        />

        {/* Single form */}
        <form
          id="product-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5"
        >
          <ProductBasicInfoSection
            register={register}
            categories={categories}
            isSubmitting={isSubmitting}
          />

          <CostStructureSection
            costMode={costMode}
            onChangeMode={setCostMode}
            isSubmitting={isSubmitting}
            register={register}
            setValue={setValue}
            recipes={recipes}
            selectedRecipeId={selectedRecipeId}
            initialSearchText={initialSearchText}
            recipeBatchCost={recipeBatchCost}
            recipeYield={recipeYield}
            manufacturingCost={manufacturingCost}
            onSelectRecipe={handleSelectRecipe}
            onClearRecipe={handleClearRecipe}
            products={products}
            currentProductId={product?.id}
            currentCategoryId={selectedCategoryId || undefined}
            components={components}
            onComponentsChange={setComponents}
          />

          <PricingSection
            register={register}
            targetMargin={currentTargetPercentage}
            categoryName={selectedCategory?.name ?? null}
            totalCost={totalCost}
            suggestedPrice={suggestedPrice}
            profit={profit}
            onApplySuggestedPrice={handleApplySuggestedPrice}
            priceValue={priceValue}
            onApplySuggestedRappiPrice={handleApplySuggestedRappiPrice}
          />

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          <ProductFormFooter
            isSubmitting={isSubmitting}
            submitLabel={submitLabel}
            onClose={onClose}
          />
        </form>

        <ProductFormMobileSubmit
          isSubmitting={isSubmitting}
          submitLabel={submitLabel}
        />
      </div>
    </>
  );
}
