"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { X, ChefHat, Calculator, Receipt, ArrowRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { CreateProduct, Product } from "@/types";
import { useCategories } from "@/hooks/useCategories";
import { useRecipes } from "@/hooks/useRecipes";

interface TargetPercentageOption {
  title: string;
  value: number;
}

const TARGET_PERCENTAGE_OPTIONS: TargetPercentageOption[] = [
  { title: "Bebidas", value: 25 },
  { title: "Postres", value: 30 },
  { title: "Para picar", value: 30 },
  { title: "Tortas & Cakes", value: 32 },
  { title: "Brunch & Sandwichs", value: 35 },
];

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

  // Estados para Receta y Rendimiento
  const [searchRecipe, setSearchRecipe] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [showRecipeDropdown, setShowRecipeDropdown] = useState(false);
  const [recipeBatchCost, setRecipeBatchCost] = useState<number>(0);
  const [recipeYield, setRecipeYield] = useState<number>(1);

  // Estado de selección por TÍTULO
  const [selectedOptionTitle, setSelectedOptionTitle] = useState<string>(
    TARGET_PERCENTAGE_OPTIONS[0].title
  );

  const currentTargetPercentage =
    TARGET_PERCENTAGE_OPTIONS.find((opt) => opt.title === selectedOptionTitle)
      ?.value || 0;

  const { categories } = useCategories();
  const { recipes } = useRecipes();

  const { register, handleSubmit, reset, setValue, watch } =
    useForm<CreateProduct>({
      defaultValues: {
        manufacturing_cost: 0,
      },
    });

  const manufacturingCost = Number(watch("manufacturing_cost") || 0);
  const priceValue = Number(watch("price") || 0);

  // Cálculos
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

  // Efecto: Recalcular costo unitario cuando cambia rendimiento o costo lote
  useEffect(() => {
    if (selectedRecipeId && recipeBatchCost > 0) {
      const safeYield = recipeYield > 0 ? recipeYield : 1;
      const unitCost = recipeBatchCost / safeYield;

      setValue("manufacturing_cost", Number(unitCost.toFixed(2)), {
        shouldValidate: true,
      });
    }
  }, [recipeBatchCost, recipeYield, selectedRecipeId, setValue]);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        reset({
          name: product.name,
          categoryId: product.category_id ?? undefined,
          manufacturing_cost: product.manufacturing_cost ?? 0,
          price: product.price,
        });
        setRecipeBatchCost(0);
        setRecipeYield(1);
      } else {
        reset({
          name: "",
          categoryId: undefined,
          manufacturing_cost: 0,
          price: 0,
        });
        setRecipeBatchCost(0);
        setRecipeYield(1);
      }
      setSelectedRecipeId(null);
      setSearchRecipe("");
      setSelectedOptionTitle(TARGET_PERCENTAGE_OPTIONS[0].title);
    }
  }, [isOpen, product, reset]);

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchRecipe.toLowerCase())
  );

  const handleSelectRecipe = (id: number, name: string) => {
    setSelectedRecipeId(id);
    setSearchRecipe(name);
    setShowRecipeDropdown(false);

    const recipe = recipes.find((item) => item.id === id);
    const cost = recipe?.manufacturing_cost ?? 0;

    setRecipeBatchCost(cost);
    setRecipeYield(1);
  };

  const handleClearRecipe = () => {
    setSelectedRecipeId(null);
    setSearchRecipe("");
    setRecipeBatchCost(0);
    setRecipeYield(1);
    setValue("manufacturing_cost", 0, { shouldValidate: true });
  };

  const handleApplySuggestedPrice = () => {
    setValue("price", Number(suggestedPrice.toFixed(2)), {
      shouldValidate: true,
    });
  };

  // Click outside handler
  useEffect(() => {
    if (!showRecipeDropdown) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".recipe-search-container")) {
        setShowRecipeDropdown(false);
      }
    };
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showRecipeDropdown]);

  if (!isOpen) return null;

  const onSubmit: SubmitHandler<CreateProduct> = async (data) => {
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const productData = {
        name: data.name.toLowerCase(),
        category_id: data.categoryId,
        manufacturing_cost: Number(data.manufacturing_cost ?? 0),
        price: Number(data.price),
      };

      if (isEditMode) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(productData);
        if (error) throw error;
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al guardar producto:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary-200 bg-primary-50 rounded-t-xl sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-primary-900">
            {isEditMode ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-primary-700" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Información Básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-900 mb-1.5">
                Nombre del producto <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                {...register("name", {
                  required: "El nombre es requerido",
                  maxLength: { value: 50, message: "Máximo 50 caracteres" },
                })}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Ej: Cheesecake de Fresa"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-900 mb-1.5">
                Categoría <span className="text-red-600">*</span>
              </label>
              <select
                {...register("categoryId", {
                  required: "La categoría es requerida",
                  valueAsNumber: true,
                })}
                defaultValue=""
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
              >
                <option value="">Seleccionar</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sección: Estructura de Costos (Estilo AZUL) */}
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-white">
            <h3 className="text-base font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              Estructura de Costo
            </h3>

            {/* Buscador de receta */}
            <div className="relative recipe-search-container mb-3">
              <label className="block text-sm font-medium text-blue-900 mb-1.5">
                Vincular receta base (Opcional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchRecipe}
                  onChange={(e) => {
                    setSearchRecipe(e.target.value);
                    setShowRecipeDropdown(true);
                  }}
                  onFocus={() => setShowRecipeDropdown(true)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Buscar receta para calcular costo..."
                />
                {selectedRecipeId && (
                  <button
                    type="button"
                    onClick={handleClearRecipe}
                    className="absolute right-3 top-3 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {showRecipeDropdown &&
                searchRecipe &&
                filteredRecipes.length > 0 && (
                  <ul className="absolute z-20 w-full mt-1 bg-white border border-blue-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredRecipes.map((recipe) => (
                      <li
                        key={recipe.id}
                        onClick={() =>
                          handleSelectRecipe(recipe.id, recipe.name)
                        }
                        className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors capitalize flex justify-between"
                      >
                        <span>{recipe.name}</span>
                        <span className="text-xs text-blue-600 font-medium">
                          S/ {recipe.manufacturing_cost}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
            </div>

            {/* Lógica de Rendimiento (Si hay receta seleccionada) */}
            {selectedRecipeId ? (
              <div className="bg-white border border-blue-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-blue-800">Costo total de receta:</span>
                  <span className="font-semibold text-blue-900">
                    S/ {recipeBatchCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-blue-700 mb-1">
                      Porciones que rinde
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={recipeYield}
                      onChange={(e) => setRecipeYield(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-blue-300 rounded bg-blue-50 text-center font-semibold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="pb-2 text-blue-300">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-right">
                    <span className="block text-xs font-medium text-blue-700 mb-1">
                      Costo Unitario
                    </span>
                    <span className="block text-lg font-bold text-blue-900">
                      S/ {manufacturingCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Entrada Manual (Si no hay receta) */
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1.5">
                  Costo de fabricación manual (S/)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("manufacturing_cost", {
                    min: 0,
                    valueAsNumber: true,
                  })}
                  className="w-full px-4 py-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          {/* Sección: Margen y Precio (Estilo VERDE y MORADO) */}
          <div className="grid grid-cols-1 gap-4">
            {/* Selector de Margen (Estilo Morado - Configuración) */}
            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Margen Objetivo
                </h3>
                <span className="text-xs font-bold text-purple-700 bg-white px-2 py-1 rounded border border-purple-100">
                  {currentTargetPercentage}% sobre costo
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {TARGET_PERCENTAGE_OPTIONS.map((option) => {
                  const isActive = selectedOptionTitle === option.title;
                  return (
                    <button
                      key={option.title}
                      type="button"
                      onClick={() => setSelectedOptionTitle(option.title)}
                      className={`
                        px-3 py-1.5 rounded-md text-xs font-medium transition-all border
                        ${
                          isActive
                            ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                            : "bg-white text-purple-700 border-purple-200 hover:border-purple-300 hover:bg-purple-100"
                        }
                      `}
                    >
                      {option.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Análisis Financiero (Estilo Verde - Resultado) */}
            <div className="border-2 border-green-300 rounded-lg p-4 bg-gradient-to-br from-green-50 to-white">
              <h3 className="text-base font-semibold text-green-900 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Precio Final
              </h3>

              <div className="grid grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-green-700 mb-1">
                      Costo Unitario (+5% merma)
                    </label>
                    <div className="text-lg font-semibold text-green-900">
                      S/ {totalCost.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-green-700 mb-1">
                      Precio Sugerido
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-green-700">
                        S/ {suggestedPrice.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={handleApplySuggestedPrice}
                        disabled={!totalCost}
                        className="text-[10px] uppercase tracking-wide font-bold bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-green-200 shadow-sm">
                  <label className="block text-sm font-bold text-green-900 mb-1.5">
                    Precio de Venta (S/)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("price", {
                      required: "Requerido",
                      min: 0.01,
                    })}
                    className="w-full px-3 py-2 border-2 border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-bold text-xl text-green-900 text-right"
                    placeholder="0.00"
                  />
                  <div className="mt-2 text-right border-t border-dashed border-green-200 pt-2">
                    <span className="text-xs text-green-600 mr-2">
                      Ganancia Neta:
                    </span>
                    <span
                      className={`font-bold ${
                        profit >= 0 ? "text-green-700" : "text-red-500"
                      }`}
                    >
                      S/ {profit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 border-2 border-primary-300 text-primary-700 font-medium rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? "Guardando..."
                : isEditMode
                ? "Actualizar"
                : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
