import { useEffect, type MutableRefObject } from "react";
import type { UseFormReset } from "react-hook-form";
import type { Recipe, CreateRecipe } from "@/types";
import type { RecipeIngredientLine } from "../types";
import { loadRecipeIngredients } from "../services/recipeIngredientsService";
import { fetchRecipeProducible } from "../services/recipeProducibleService";

interface RecipeFormInitState {
  reset: UseFormReset<CreateRecipe>;
  setRecipeIngredients: (v: RecipeIngredientLine[]) => void;
  setLoadingIngredients: (v: boolean) => void;
  setAddAsIngredient: (v: boolean) => void;
  setEditingIngredient: (v: RecipeIngredientLine | null) => void;
  setSubmitError: (v: string | null) => void;
  originalIngredientsRef: MutableRefObject<RecipeIngredientLine[]>;
}

/**
 * Handles all open/edit initialization for RecipeForm:
 * 1. Resets the form fields when the modal opens (create or edit).
 * 2. Loads recipe_ingredients rows when editing.
 * 3. Fetches the producible toggle state when editing.
 *
 * Keeps the heavy useEffect logic out of the form container to stay under 300 LOC.
 */
export function useRecipeFormInit(
  isOpen: boolean,
  recipe: Recipe | undefined,
  isEditMode: boolean,
  effectiveReadOnlyMeta: boolean,
  hidePrice: boolean,
  state: RecipeFormInitState,
): void {
  const {
    reset,
    setRecipeIngredients,
    setLoadingIngredients,
    setAddAsIngredient,
    setEditingIngredient,
    setSubmitError,
    originalIngredientsRef,
  } = state;

  // Reset form fields whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (recipe) {
      reset({
        name: recipe.name,
        description: recipe.description,
        preparation_steps: recipe.preparation_steps ?? "",
        quantity: recipe.quantity,
        unit_of_measure: recipe.unit_of_measure,
        manufacturing_cost: recipe.manufacturing_cost,
      });
    } else {
      reset({
        name: "",
        description: "",
        preparation_steps: "",
        quantity: hidePrice ? 1 : 0,
        unit_of_measure: hidePrice ? "und" : "",
        manufacturing_cost: 0,
      });
      setRecipeIngredients([]);
      originalIngredientsRef.current = [];
    }
    setAddAsIngredient(!isEditMode && !effectiveReadOnlyMeta && !hidePrice);
    setEditingIngredient(null);
    setSubmitError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, recipe]);

  // Load recipe_ingredients when editing
  useEffect(() => {
    if (!isEditMode || !recipe) return;
    setLoadingIngredients(true);
    loadRecipeIngredients(recipe.id)
      .then((loaded: RecipeIngredientLine[]) => {
        setRecipeIngredients(loaded);
        originalIngredientsRef.current = loaded;
      })
      .finally(() => setLoadingIngredients(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, recipe]);

  // Fetch producible toggle state when editing
  useEffect(() => {
    if (!isOpen || !isEditMode || !recipe) return;
    fetchRecipeProducible(recipe.id)
      .then((p) => setAddAsIngredient(!!p))
      .catch((err: unknown) => {
        console.error("[RecipeForm] fetchRecipeProducible failed:", err);
        if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
          import("@sentry/nextjs").then((Sentry) => Sentry.captureException(err));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEditMode, recipe]);

}
