"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { ArrowLeft, X, Trash2, SquarePen } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useIngredients } from "@/hooks/useIngredients";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/utils/auditLog";
import type {
  Recipe,
  CreateRecipe,
  RecipeIngredientWithRelation,
} from "@/types";

interface RecipeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  recipe?: Recipe;
  hidePrice?: boolean;
  readOnlyMeta?: boolean;
  productId?: number;
}

interface RecipeIngredient {
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit_of_measure: string;
  ingredient_price: number;
  ingredient_unit: string;
  ingredient_quantity_stock: number;
  equivalent_price?: number;
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
  const [searchIngredient, setSearchIngredient] = useState("");
  const [selectedIngredientId, setSelectedIngredientId] = useState<
    number | null
  >(null);
  const [ingredientQuantity, setIngredientQuantity] = useState("");
  const [ingredientUnit, setIngredientUnit] = useState("");
  const [recipeIngredients, setRecipeIngredients] = useState<
    RecipeIngredient[]
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [addAsIngredient, setAddAsIngredient] = useState<boolean>(false);
  const [editingIngredientId, setEditingIngredientId] = useState<number | null>(null);

  const originalIngredientsRef = useRef<RecipeIngredient[]>([]);

  const { ingredients } = useIngredients();
  const { user, profile, isAdmin } = useAuth();
  const { register, handleSubmit, reset, setValue } = useForm<CreateRecipe>();

  const convertToBaseUnit = (
    quantity: number,
    unit: string,
    targetType: "weight" | "volume"
  ): number => {
    const weightUnits: { [key: string]: number } = { kg: 1000, g: 1 };
    const volumeUnits: { [key: string]: number } = { l: 1000, ml: 1 };

    if (targetType === "weight" && weightUnits[unit]) {
      return quantity * weightUnits[unit];
    }
    if (targetType === "volume" && volumeUnits[unit]) {
      return quantity * volumeUnits[unit];
    }
    return quantity;
  };

  const calculateIngredientCost = (
    recipeQuantity: number,
    recipeUnit: string,
    ingredientPrice: number,
    ingredientQuantity: number,
    ingredientUnit: string
  ): number => {
    const isWeight =
      ["kg", "g"].includes(recipeUnit) && ["kg", "g"].includes(ingredientUnit);
    const isVolume =
      ["l", "ml"].includes(recipeUnit) && ["l", "ml"].includes(ingredientUnit);

    if (isWeight) {
      const recipeInGrams = convertToBaseUnit(
        recipeQuantity,
        recipeUnit,
        "weight"
      );
      const stockInGrams = convertToBaseUnit(
        ingredientQuantity,
        ingredientUnit,
        "weight"
      );
      return (recipeInGrams / stockInGrams) * ingredientPrice;
    }

    if (isVolume) {
      const recipeInMl = convertToBaseUnit(
        recipeQuantity,
        recipeUnit,
        "volume"
      );
      const stockInMl = convertToBaseUnit(
        ingredientQuantity,
        ingredientUnit,
        "volume"
      );
      return (recipeInMl / stockInMl) * ingredientPrice;
    }

    if (recipeUnit === "und" && ingredientUnit === "und") {
      return (recipeQuantity / ingredientQuantity) * ingredientPrice;
    }

    return 0;
  };

  useEffect(() => {
    const total = recipeIngredients.reduce((sum, item) => {
      const cost = calculateIngredientCost(
        item.quantity,
        item.unit_of_measure,
        item.ingredient_price,
        item.ingredient_quantity_stock,
        item.ingredient_unit
      );
      return sum + cost;
    }, 0);

    setTotalCost(total);
    setValue("manufacturing_cost", Number(total.toFixed(2)));
  }, [recipeIngredients, setValue]);

  useEffect(() => {
    const loadRecipeIngredients = async () => {
      if (isEditMode && recipe) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("recipe_ingredients")
          .select(
            `
            quantity,
            unit_of_measure,
            recipe_ingredients_id,
            ingredients (
              id,
              name,
              price,
              quantity,
              unit_of_measure
            )
          `
          )
          .eq("recipe_id", recipe.id);

        if (!error && data) {
          const typedData = data as unknown as RecipeIngredientWithRelation[];
          const formattedIngredients: RecipeIngredient[] = typedData.map(
            (item: RecipeIngredientWithRelation) => {
              const equivalentPrice = calculateIngredientCost(
                item.quantity,
                item.unit_of_measure,
                item.ingredients.price,
                item.ingredients.quantity,
                item.ingredients.unit_of_measure
              );

              return {
                ingredient_id: item.ingredients.id,
                ingredient_name: item.ingredients.name,
                quantity: item.quantity,
                unit_of_measure: item.unit_of_measure,
                ingredient_price: item.ingredients.price,
                ingredient_unit: item.ingredients.unit_of_measure,
                ingredient_quantity_stock: item.ingredients.quantity,
                equivalent_price: equivalentPrice,
              };
            }
          );
          setRecipeIngredients(formattedIngredients);
          originalIngredientsRef.current = formattedIngredients;
        }
      }
    };

    loadRecipeIngredients();
  }, [isEditMode, recipe]);

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
      setSearchIngredient("");
      setSelectedIngredientId(null);
      setIngredientQuantity("");
      setIngredientUnit("");
      setEditingIngredientId(null);
    }
  }, [isOpen, recipe, reset, readOnlyMeta, hidePrice]);

  if (!isOpen) return null;

  const filteredIngredients = ingredients.filter((ingredient) =>
    ingredient.name.toLowerCase().includes(searchIngredient.toLowerCase())
  );

  const selectedIngredient = selectedIngredientId
    ? ingredients.find((ing) => ing.id === selectedIngredientId)
    : null;

  const handleSelectIngredient = (id: number, name: string) => {
    const ingredient = ingredients.find((ing) => ing.id === id);
    setSelectedIngredientId(id);
    setSearchIngredient(name);
    setShowDropdown(false);
    if (ingredient) {
      setIngredientUnit(ingredient.unit_of_measure);
    }
  };

  const handleAddIngredient = () => {
    if (!selectedIngredientId || !ingredientQuantity || !ingredientUnit) {
      alert("Por favor completa todos los campos del ingrediente");
      return;
    }

    const ingredient = ingredients.find(
      (ing) => ing.id === selectedIngredientId
    );
    if (!ingredient) return;

    const equivalentPrice = calculateIngredientCost(
      parseFloat(ingredientQuantity),
      ingredientUnit,
      ingredient.price,
      ingredient.quantity,
      ingredient.unit_of_measure
    );

    if (editingIngredientId) {
      // Update existing ingredient
      setRecipeIngredients(
        recipeIngredients.map((item) =>
          item.ingredient_id === editingIngredientId
            ? {
                ...item,
                ingredient_id: selectedIngredientId,
                ingredient_name: ingredient.name,
                quantity: parseFloat(ingredientQuantity),
                unit_of_measure: ingredientUnit,
                ingredient_price: ingredient.price,
                ingredient_unit: ingredient.unit_of_measure,
                ingredient_quantity_stock: ingredient.quantity,
                equivalent_price: equivalentPrice,
              }
            : item
        )
      );
      setEditingIngredientId(null);
    } else {
      // Check for duplicates only when adding
      const exists = recipeIngredients.some(
        (item) => item.ingredient_id === selectedIngredientId
      );
      if (exists) {
        alert("Este ingrediente ya está agregado a la receta");
        return;
      }

      const newIngredient: RecipeIngredient = {
        ingredient_id: selectedIngredientId,
        ingredient_name: ingredient.name,
        quantity: parseFloat(ingredientQuantity),
        unit_of_measure: ingredientUnit,
        ingredient_price: ingredient.price,
        ingredient_unit: ingredient.unit_of_measure,
        ingredient_quantity_stock: ingredient.quantity,
        equivalent_price: equivalentPrice,
      };

      setRecipeIngredients([...recipeIngredients, newIngredient]);
    }

    setSearchIngredient("");
    setSelectedIngredientId(null);
    setIngredientQuantity("");
    setIngredientUnit("");
  };

  const handleEditIngredient = (item: RecipeIngredient) => {
    setEditingIngredientId(item.ingredient_id);
    setSearchIngredient(item.ingredient_name);
    setSelectedIngredientId(item.ingredient_id);
    setIngredientQuantity(String(item.quantity));
    setIngredientUnit(item.unit_of_measure);
  };

  const handleCancelEdit = () => {
    setEditingIngredientId(null);
    setSearchIngredient("");
    setSelectedIngredientId(null);
    setIngredientQuantity("");
    setIngredientUnit("");
  };

  const handleRemoveIngredient = (ingredientId: number) => {
    if (editingIngredientId === ingredientId) {
      handleCancelEdit();
    }
    setRecipeIngredients(
      recipeIngredients.filter((item) => item.ingredient_id !== ingredientId)
    );
  };

  const computeIngredientDiff = () => {
    const original = originalIngredientsRef.current;
    const originalMap = new Map(original.map((i) => [i.ingredient_id, i]));
    const currentMap = new Map(recipeIngredients.map((i) => [i.ingredient_id, i]));

    const added: { name: string; quantity: number; unit: string }[] = [];
    const removed: { name: string; quantity: number; unit: string }[] = [];
    const modified: { name: string; from: string; to: string }[] = [];

    for (const curr of recipeIngredients) {
      const orig = originalMap.get(curr.ingredient_id);
      if (!orig) {
        added.push({ name: curr.ingredient_name, quantity: curr.quantity, unit: curr.unit_of_measure });
      } else if (orig.quantity !== curr.quantity || orig.unit_of_measure !== curr.unit_of_measure) {
        modified.push({
          name: curr.ingredient_name,
          from: `${orig.quantity} ${orig.unit_of_measure}`,
          to: `${curr.quantity} ${curr.unit_of_measure}`,
        });
      }
    }

    for (const orig of original) {
      if (!currentMap.has(orig.ingredient_id)) {
        removed.push({ name: orig.ingredient_name, quantity: orig.quantity, unit: orig.unit_of_measure });
      }
    }

    return { added, removed, modified };
  };

  const onSubmit: SubmitHandler<CreateRecipe> = async (data) => {
    if (recipeIngredients.length === 0) {
      alert("Debes agregar al menos un ingrediente a la receta");
      return;
    }

    if (!data.unit_of_measure) {
      alert("Debes seleccionar una unidad de medida para la receta");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Non-admin edit mode: only update cost + ingredients
      if (readOnlyMeta && isEditMode && recipe) {
        // 1. Update only manufacturing_cost on recipe
        const { error: recipeError } = await supabase
          .from("recipes")
          .update({ manufacturing_cost: Number(data.manufacturing_cost) })
          .eq("id", recipe.id);
        if (recipeError) throw recipeError;

        // 2. Delete + re-insert recipe_ingredients
        await supabase
          .from("recipe_ingredients")
          .delete()
          .eq("recipe_id", recipe.id);

        const ingredientsToInsert = recipeIngredients.map((ingredient) => ({
          recipe_id: recipe.id,
          recipe_ingredients_id: ingredient.ingredient_id,
          quantity: ingredient.quantity,
          unit_of_measure: ingredient.unit_of_measure,
        }));

        const { error: ingredientsError } = await supabase
          .from("recipe_ingredients")
          .insert(ingredientsToInsert);
        if (ingredientsError) throw ingredientsError;

        // 3. Update ingredient-recipe price in ingredients table
        await supabase
          .from("ingredients")
          .update({ price: Number(data.manufacturing_cost) })
          .eq("name", recipe.name.toLowerCase());

        // 4. Update products.manufacturing_cost if productId provided
        if (productId && recipe.quantity > 0) {
          const unitCost = Number(data.manufacturing_cost) / recipe.quantity;
          await supabase
            .from("products")
            .update({ manufacturing_cost: Number(unitCost.toFixed(2)) })
            .eq("id", productId);
        }

        // 5. Audit log with diff
        const diff = computeIngredientDiff();
        logAudit({
          userId: user?.id ?? null,
          userName: profile?.full_name ?? null,
          action: "editar_ingredientes_receta",
          targetTable: "recipes",
          targetId: recipe.id,
          targetDescription: `Receta: ${recipe.name}`,
          details: {
            recipe_name: recipe.name,
            product_id: productId ?? null,
            new_cost: Number(data.manufacturing_cost),
            ...diff,
          },
        });

        onSuccess();
        onClose();
        return;
      }

      // Standard flow (admin or non-admin create)
      const recipeData = {
        name: data.name.toLowerCase(),
        description: data.description,
        quantity: Number(data.quantity),
        unit_of_measure: data.unit_of_measure,
        manufacturing_cost: Number(data.manufacturing_cost),
      };

      let recipeId: number;

      if (isEditMode) {
        const { error } = await supabase
          .from("recipes")
          .update(recipeData)
          .eq("id", recipe!.id);

        if (error) throw error;
        recipeId = recipe!.id;

        await supabase
          .from("recipe_ingredients")
          .delete()
          .eq("recipe_id", recipeId);

        await supabase
          .from("ingredients")
          .update({
            name: data.name.toLowerCase(),
            quantity: Number(data.quantity),
            unit_of_measure: data.unit_of_measure,
            price: Number(data.manufacturing_cost),
          })
          .eq("name", recipe!.name.toLowerCase());
      } else {
        const { data: newRecipe, error } = await supabase
          .from("recipes")
          .insert(recipeData)
          .select()
          .single();

        if (error) throw error;
        recipeId = newRecipe.id;

        if (addAsIngredient) {
          await supabase.from("ingredients").insert({
            name: data.name.toLowerCase(),
            quantity: Number(data.quantity),
            unit_of_measure: data.unit_of_measure,
            price: Number(data.manufacturing_cost),
          });
        }

        // Non-admin create: link recipe to product
        if (productId) {
          const unitCost = Number(data.quantity) > 0
            ? Number(data.manufacturing_cost) / Number(data.quantity)
            : 0;
          await supabase
            .from("products")
            .update({
              recipe_id: recipeId,
              manufacturing_cost: Number(unitCost.toFixed(2)),
            })
            .eq("id", productId);

          logAudit({
            userId: user?.id ?? null,
            userName: profile?.full_name ?? null,
            action: "crear_receta_producto",
            targetTable: "recipes",
            targetId: recipeId,
            targetDescription: `Receta: ${data.name} para producto #${productId}`,
            details: {
              recipe_name: data.name,
              product_id: productId,
              total_cost: Number(data.manufacturing_cost),
              ingredients: recipeIngredients.map((i) => ({
                name: i.ingredient_name,
                quantity: i.quantity,
                unit: i.unit_of_measure,
              })),
            },
          });
        }
      }

      const ingredientsToInsert = recipeIngredients.map((ingredient) => ({
        recipe_id: recipeId,
        recipe_ingredients_id: ingredient.ingredient_id,
        quantity: ingredient.quantity,
        unit_of_measure: ingredient.unit_of_measure,
      }));

      const { error: ingredientsError } = await supabase
        .from("recipe_ingredients")
        .insert(ingredientsToInsert);

      if (ingredientsError) throw ingredientsError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al guardar la receta:", error);
      alert("Ocurrió un error al guardar la receta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFormTitle = () => {
    if (readOnlyMeta && isEditMode) return "Editar Ingredientes";
    if (!isEditMode && productId) return "Crear Receta";
    return isEditMode ? "Editar Receta" : "Agregar Receta";
  };

  const formTitle = getFormTitle();

  const formFields = (
    <>
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

      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
        <label className="block text-sm font-medium text-slate-900 mb-3">
          Ingredientes de la receta <span className="text-red-600">*</span>
        </label>

        <div className="space-y-3">
          <div className="flex gap-2 items-start">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchIngredient}
                onChange={(e) => {
                  setSearchIngredient(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                placeholder="Buscar ingrediente..."
              />

              {showDropdown &&
                searchIngredient &&
                filteredIngredients.length > 0 && (
                  <ul className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredIngredients.map((ingredient) => (
                      <li
                        key={ingredient.id}
                        onClick={() =>
                          handleSelectIngredient(
                            ingredient.id,
                            ingredient.name
                          )
                        }
                        className="px-4 py-3.5 hover:bg-slate-100 cursor-pointer transition-colors capitalize flex justify-between items-center"
                      >
                        <span>{ingredient.name}</span>
                        <span className="text-xs text-slate-500 font-medium lowercase">
                          ({ingredient.quantity}{" "}
                          {ingredient.unit_of_measure})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
            </div>

            {selectedIngredient && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center whitespace-nowrap min-w-fit">
                <span className="text-sm font-semibold text-blue-700">
                  {selectedIngredient.quantity}{" "}
                  {selectedIngredient.unit_of_measure}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1.5">
                Cantidad <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={ingredientQuantity}
                onChange={(e) => setIngredientQuantity(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
                placeholder="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1.5">
                Unidad <span className="text-red-600">*</span>
              </label>
              <select
                value={ingredientUnit}
                onChange={(e) => setIngredientUnit(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
              >
                <option value="">Seleccionar</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
                <option value="und">und</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddIngredient}
            disabled={isSubmitting}
            className="w-full bg-primary-900 py-3 min-h-[44px] text-white rounded-lg hover:bg-primary-800 disabled:bg-gray-400 transition-colors font-medium"
          >
            {editingIngredientId ? "Actualizar ingrediente" : "Agregar ingrediente"}
          </button>
          {editingIngredientId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors py-1"
            >
              Cancelar edición
            </button>
          )}
        </div>

        {recipeIngredients.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-slate-900 mb-2">
              Ingredientes agregados ({recipeIngredients.length})
            </h3>

            {/* Mobile card list */}
            <div className="space-y-2 md:hidden">
              {recipeIngredients.map((item) => (
                <div key={item.ingredient_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 capitalize truncate">{item.ingredient_name}</p>
                    <p className="text-xs text-slate-500">{item.quantity} {item.unit_of_measure}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    {!hidePrice && (
                      <span className="text-sm font-semibold text-green-600">S/ {item.equivalent_price?.toFixed(2) || "0.00"}</span>
                    )}
                    <button type="button" onClick={() => handleEditIngredient(item)} disabled={isSubmitting} className="p-2.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50">
                      <SquarePen className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleRemoveIngredient(item.ingredient_id)} disabled={isSubmitting} className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {!hidePrice && (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-semibold text-green-900">Total de ingredientes:</span>
                  <span className="text-sm font-semibold text-green-700">S/ {totalCost.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 uppercase">
                      Ingrediente
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 uppercase">
                      Cantidad
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 uppercase">
                      Unidad
                    </th>
                    {!hidePrice && (
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-700 uppercase">
                        Precio
                      </th>
                    )}
                    <th className="px-4 py-2 text-center text-xs font-medium text-slate-700 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recipeIngredients.map((item) => (
                    <tr
                      key={item.ingredient_id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-slate-900 capitalize">
                        {item.ingredient_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {item.unit_of_measure}
                      </td>
                      {!hidePrice && (
                        <td className="px-4 py-3 text-sm text-slate-900 text-right font-semibold">
                          <span className="text-green-600">
                            S/ {item.equivalent_price?.toFixed(2) || "0.00"}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditIngredient(item)}
                            disabled={isSubmitting}
                            className="p-2.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Editar ingrediente"
                          >
                            <SquarePen className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveIngredient(item.ingredient_id)
                            }
                            disabled={isSubmitting}
                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Eliminar ingrediente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!hidePrice && (
                    <tr className="bg-green-50 font-semibold">
                      <td
                        colSpan={3}
                        className="px-4 py-3 text-sm text-right text-green-900"
                      >
                        Total de ingredientes:
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-700">
                        S/ {totalCost.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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

      {hidePrice && (
        <>
          <input type="hidden" {...register("quantity")} />
          <input type="hidden" {...register("unit_of_measure")} />
        </>
      )}

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
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
                <option value="und">und</option>
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
    </>
  );

  return (
    <>
      {/* Mobile fullscreen view */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 -ml-2 text-slate-600 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900">
            {formTitle}
          </h2>
          <div className="w-9" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {formFields}
          </div>

          <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-white">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
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

      {/* Desktop modal view */}
      <div
        className="hidden md:flex fixed inset-0 bg-black/50 backdrop-blur-sm z-50 items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl sticky top-0 z-10">
            <h2 className="text-xl font-semibold text-slate-900">
              {formTitle}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {formFields}

            <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
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
    </>
  );
}
