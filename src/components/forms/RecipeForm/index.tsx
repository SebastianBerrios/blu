"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { ArrowLeft, X } from "lucide-react";
import { useIngredients } from "@/hooks/useIngredients";
import { useAuth } from "@/hooks/useAuth";
import type { Recipe, CreateRecipe } from "@/types";
import type { RecipeIngredientLine, RecipeSubmitParams } from "@/features/recetas/types";
import { UNIT_OPTIONS } from "@/features/recetas/constants";
import {
  calculateTotalCost,
  loadRecipeIngredients,
  createRecipe,
  updateRecipe,
  updateRecipeIngredientsOnly,
} from "@/features/recetas/services/recipesService";
import IngredientSelector from "@/features/recetas/components/IngredientSelector";
import IngredientList from "@/features/recetas/components/IngredientList";

interface RecipeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  recipe?: Recipe;
  hidePrice?: boolean;
  readOnlyMeta?: boolean;
  productId?: number;
}

export default function RecipeForm({
  isOpen,
  onClose,
  onSuccess,
  recipe,
  hidePrice = false,
  readOnlyMeta = false,
  productId,
}: RecipeFormProps) {
  const isEditMode = !!recipe;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredientLine[]>([]);
  const [addAsIngredient, setAddAsIngredient] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<RecipeIngredientLine | null>(null);

  const originalIngredientsRef = useRef<RecipeIngredientLine[]>([]);

  const { ingredients } = useIngredients();
  const { user, profile, isAdmin } = useAuth();
  const { register, handleSubmit, reset, setValue } = useForm<CreateRecipe>();

  const totalCost = calculateTotalCost(recipeIngredients);

  // Sync totalCost to form field
  useEffect(() => {
    setValue("manufacturing_cost", Number(totalCost.toFixed(2)));
  }, [totalCost, setValue]);

  // Load recipe ingredients on edit
  useEffect(() => {
    if (isEditMode && recipe) {
      loadRecipeIngredients(recipe.id).then((loaded) => {
        setRecipeIngredients(loaded);
        originalIngredientsRef.current = loaded;
      });
    }
  }, [isEditMode, recipe]);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      if (recipe) {
        reset({
          name: recipe.name,
          description: recipe.description,
          quantity: recipe.quantity,
          unit_of_measure: recipe.unit_of_measure,
          manufacturing_cost: recipe.manufacturing_cost,
        });
      } else {
        reset({
          name: "",
          description: hidePrice ? "-" : "",
          quantity: hidePrice ? 1 : 0,
          unit_of_measure: hidePrice ? "und" : "",
          manufacturing_cost: 0,
        });
        setRecipeIngredients([]);
        originalIngredientsRef.current = [];
      }
      setAddAsIngredient(readOnlyMeta || hidePrice ? false : true);
      setEditingIngredient(null);
      setSubmitError(null);
    }
  }, [isOpen, recipe, reset, readOnlyMeta, hidePrice]);

  if (!isOpen) return null;

  const onSubmit: SubmitHandler<CreateRecipe> = async (data) => {
    if (recipeIngredients.length === 0) {
      setSubmitError("Debes agregar al menos un ingrediente a la receta");
      return;
    }

    if (!data.unit_of_measure) {
      setSubmitError("Debes seleccionar una unidad de medida para la receta");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const params: RecipeSubmitParams = {
        formData: data,
        ingredients: recipeIngredients,
        originalIngredients: originalIngredientsRef.current,
        recipe,
        productId,
        readOnlyMeta,
        addAsIngredient,
        userId: user?.id ?? null,
        userName: profile?.full_name ?? null,
      };

      if (readOnlyMeta && isEditMode) {
        await updateRecipeIngredientsOnly(params);
      } else if (isEditMode) {
        await updateRecipe(params);
      } else {
        await createRecipe(params);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al guardar la receta:", error);
      setSubmitError("Ocurrió un error al guardar la receta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddIngredient = (ingredient: RecipeIngredientLine) => {
    setRecipeIngredients((prev) => [...prev, ingredient]);
  };

  const handleUpdateIngredient = (ingredientId: number, updated: RecipeIngredientLine) => {
    setRecipeIngredients((prev) =>
      prev.map((item) => (item.ingredient_id === ingredientId ? updated : item))
    );
    setEditingIngredient(null);
  };

  const handleRemoveIngredient = (ingredientId: number) => {
    if (editingIngredient?.ingredient_id === ingredientId) {
      setEditingIngredient(null);
    }
    setRecipeIngredients((prev) =>
      prev.filter((item) => item.ingredient_id !== ingredientId)
    );
  };

  const getFormTitle = () => {
    if (readOnlyMeta && isEditMode) return "Editar Ingredientes";
    if (!isEditMode && productId) return "Crear Receta";
    return isEditMode ? "Editar Receta" : "Agregar Receta";
  };

  const formTitle = getFormTitle();
  const submitLabel = isSubmitting
    ? "Guardando..."
    : isEditMode
      ? "Actualizar"
      : "Guardar";

  return (
    <>
      {/* Desktop backdrop */}
      <div
        className="hidden md:block fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Unified container */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[90vh] md:rounded-xl md:shadow-2xl">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0 md:hidden">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 -ml-2 text-slate-600 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900">{formTitle}</h2>
          <div className="w-9" />
        </div>

        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-slate-900">{formTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        {/* Form */}
        <form
          id="recipe-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4"
        >
          {/* Recipe name */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Nombre de la receta <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              {...register("name", {
                required: "El nombre es requerido",
                maxLength: { value: 50, message: "Máximo 50 caracteres" },
              })}
              disabled={isSubmitting}
              readOnly={readOnlyMeta}
              className={`w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100 ${readOnlyMeta ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
              placeholder="Ej: Fudge"
            />
          </div>

          {/* Description */}
          {hidePrice ? (
            <input type="hidden" {...register("description")} />
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1.5">
                Descripción de la receta <span className="text-red-600">*</span>
              </label>
              <textarea
                {...register("description", {
                  required: "La descripción es requerida",
                })}
                disabled={isSubmitting}
                readOnly={readOnlyMeta}
                rows={3}
                className={`w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100 ${readOnlyMeta ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                placeholder="Ej: Mezclar la leche con la leche condensada..."
              />
            </div>
          )}

          {/* Ingredients section */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
            <label className="block text-sm font-medium text-slate-900 mb-3">
              Ingredientes de la receta <span className="text-red-600">*</span>
            </label>

            <IngredientSelector
              ingredients={ingredients}
              recipeIngredients={recipeIngredients}
              onAdd={handleAddIngredient}
              onUpdate={handleUpdateIngredient}
              editingItem={editingIngredient}
              onCancelEdit={() => setEditingIngredient(null)}
              isSubmitting={isSubmitting}
            />

            <IngredientList
              ingredients={recipeIngredients}
              onEdit={setEditingIngredient}
              onRemove={handleRemoveIngredient}
              hidePrice={hidePrice}
              totalCost={totalCost}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Manufacturing cost */}
          {!hidePrice && (
            <div className="border-2 border-green-300 rounded-lg p-4 bg-linear-to-br from-green-50 to-white">
              <label className="block text-sm font-medium text-green-900 mb-1.5">
                Costo de fabricación (calculado automáticamente)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">
                  S/
                </span>
                <input
                  type="number"
                  step="0.01"
                  {...register("manufacturing_cost")}
                  disabled
                  className="w-full pl-8 pr-4 py-3 border-2 border-green-300 rounded-lg bg-white text-gray-800 font-semibold text-lg cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-green-700 mt-2">
                Este costo se calcula automaticamente sumando los precios de
                todos los ingredientes
              </p>
            </div>
          )}

          {/* Hidden fields when hidePrice */}
          {hidePrice && (
            <>
              <input type="hidden" {...register("quantity")} />
              <input type="hidden" {...register("unit_of_measure")} />
            </>
          )}

          {/* Yield section */}
          {!hidePrice && (addAsIngredient || !readOnlyMeta) && (
            <div className="border-2 border-blue-300 rounded-lg p-4 bg-linear-to-br from-blue-50 to-white">
              <h3 className="text-base font-semibold text-blue-900 mb-3">
                Rendimiento de la Receta
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-1.5">
                    Cantidad <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("quantity", {
                      required: "La cantidad es requerida",
                      min: { value: 0.01, message: "Debe ser mayor a 0" },
                    })}
                    disabled={isSubmitting || readOnlyMeta}
                    className={`w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 ${readOnlyMeta ? "text-gray-500 cursor-not-allowed" : ""}`}
                    placeholder="150"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-1.5">
                    Unidad <span className="text-red-600">*</span>
                  </label>
                  <select
                    {...register("unit_of_measure", {
                      required: "La unidad de medida es requerida",
                    })}
                    disabled={isSubmitting || readOnlyMeta}
                    className={`w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 ${readOnlyMeta ? "text-gray-500 cursor-not-allowed" : ""}`}
                  >
                    <option value="">Seleccionar</option>
                    {UNIT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {!readOnlyMeta && (
                <div className="bg-blue-100 rounded-lg p-3 border border-blue-200 mt-3">
                  <p className="text-xs text-blue-800">
                    <strong>Ejemplo:</strong> Si tu receta produce 150g de fudge,
                    ingresa:
                  </p>
                  <ul className="text-xs text-blue-700 mt-2 space-y-1 ml-4">
                    <li>
                      • Cantidad: <strong>150</strong>
                    </li>
                    <li>
                      • Unidad: <strong>g</strong>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Add as ingredient toggle */}
          {!isEditMode && !readOnlyMeta && isAdmin && (
            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50 flex items-start justify-between gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-900 mb-1.5">
                  ¿Agregar esta receta como ingrediente?
                </label>
                <p className="text-xs text-purple-700">
                  Si está activado, la receta se registrará en la lista de
                  ingredientes para usarla en otras preparaciones.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={addAsIngredient}
                onClick={() => setAddAsIngredient((prev) => !prev)}
                disabled={isSubmitting}
                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  addAsIngredient ? "bg-purple-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    addAsIngredient ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Submit error */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700 font-medium">{submitError}</p>
            </div>
          )}

          {/* Desktop action buttons */}
          <div className="hidden md:flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 min-h-[44px] border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {submitLabel}
            </button>
          </div>
        </form>

        {/* Mobile submit button */}
        <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-white md:hidden">
          <button
            type="submit"
            form="recipe-form"
            disabled={isSubmitting}
            className="w-full px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </>
  );
}
