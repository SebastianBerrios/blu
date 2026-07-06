"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useIngredients } from "@/hooks/useIngredients";
import { useAuth } from "@/hooks/useAuth";
import type { Recipe, CreateRecipe } from "@/types";
import type { RecipeIngredientLine, RecipeSubmitParams } from "@/features/recetas/types";
import {
  calculateTotalCost,
  createRecipe,
  updateRecipe,
  updateRecipeIngredientsOnly,
} from "@/features/recetas";
import RecipeMetadataSection from "@/features/recetas/components/RecipeMetadataSection";
import RecipeYieldSection from "@/features/recetas/components/RecipeYieldSection";
import AddAsIngredientToggle from "@/features/recetas/components/AddAsIngredientToggle";
import RecipeFormShell from "@/features/recetas/components/RecipeFormShell";
import RecipeIngredientsSection from "@/features/recetas/components/RecipeIngredientsSection";
import RecipeManufacturingCost from "@/features/recetas/components/RecipeManufacturingCost";
import { useRecipeFormInit } from "@/features/recetas/hooks/useRecipeFormInit";

interface RecipeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  recipe?: Recipe;
  hidePrice?: boolean;
  readOnlyMeta?: boolean;
  viewOnly?: boolean;
  productId?: number;
}

export default function RecipeForm({
  isOpen,
  onClose,
  onSuccess,
  recipe,
  hidePrice = false,
  readOnlyMeta = false,
  viewOnly = false,
  productId,
}: RecipeFormProps) {
  const effectiveReadOnlyMeta = readOnlyMeta || viewOnly;
  const isEditMode = !!recipe;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredientLine[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [addAsIngredient, setAddAsIngredient] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<RecipeIngredientLine | null>(null);

  const originalIngredientsRef = useRef<RecipeIngredientLine[]>([]);

  const { ingredients } = useIngredients();
  const { user, profile, isAdmin } = useAuth();
  const { register, handleSubmit, reset, setValue } = useForm<CreateRecipe>();

  const totalCost = calculateTotalCost(recipeIngredients);

  // Sync totalCost to the form's manufacturing_cost field
  useEffect(() => {
    setValue("manufacturing_cost", Number(totalCost.toFixed(2)));
  }, [totalCost, setValue]);

  // Init effects: form reset, ingredient loading, producible toggle
  useRecipeFormInit(isOpen, recipe, isEditMode, effectiveReadOnlyMeta, hidePrice, {
    reset,
    setRecipeIngredients,
    setLoadingIngredients,
    setAddAsIngredient,
    setEditingIngredient,
    setSubmitError,
    originalIngredientsRef,
  });

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
    if (viewOnly) return "Ver Receta";
    if (readOnlyMeta && isEditMode) return "Editar Ingredientes";
    if (!isEditMode && productId) return "Crear Receta";
    return isEditMode ? "Editar Receta" : "Agregar Receta";
  };

  const submitLabel = isSubmitting ? "Guardando..." : isEditMode ? "Actualizar" : "Guardar";

  return (
    <RecipeFormShell
      title={getFormTitle()}
      onClose={onClose}
      isSubmitting={isSubmitting}
      submitLabel={submitLabel}
      viewOnly={viewOnly}
      onFormSubmit={handleSubmit(onSubmit)}
    >
      <RecipeMetadataSection
        register={register}
        isSubmitting={isSubmitting}
        nameReadOnly={effectiveReadOnlyMeta}
        fieldsReadOnly={viewOnly}
      />

      <RecipeIngredientsSection
        ingredients={ingredients}
        recipeIngredients={recipeIngredients}
        loadingIngredients={loadingIngredients}
        editingIngredient={editingIngredient}
        isSubmitting={isSubmitting}
        hidePrice={hidePrice}
        viewOnly={viewOnly}
        onAdd={handleAddIngredient}
        onUpdate={handleUpdateIngredient}
        onEdit={setEditingIngredient}
        onRemove={handleRemoveIngredient}
        onCancelEdit={() => setEditingIngredient(null)}
        totalCost={totalCost}
      />

      {!hidePrice && <RecipeManufacturingCost register={register} />}

      {/* Hidden fields when hidePrice */}
      {hidePrice && (
        <>
          <input type="hidden" {...register("quantity")} />
          <input type="hidden" {...register("unit_of_measure")} />
        </>
      )}

      {/* Yield section */}
      {!hidePrice && (addAsIngredient || !effectiveReadOnlyMeta) && (
        <RecipeYieldSection
          register={register}
          isSubmitting={isSubmitting}
          readOnlyMeta={effectiveReadOnlyMeta}
        />
      )}

      {/* Add as ingredient toggle */}
      {isAdmin && !effectiveReadOnlyMeta && (!isEditMode || (!productId && !hidePrice)) && (
        <AddAsIngredientToggle
          addAsIngredient={addAsIngredient}
          onToggle={() => setAddAsIngredient((prev) => !prev)}
          isSubmitting={isSubmitting}
        />
      )}

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700 font-medium">{submitError}</p>
        </div>
      )}
    </RecipeFormShell>
  );
}
