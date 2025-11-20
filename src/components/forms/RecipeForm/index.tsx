"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { X, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useIngredients } from "@/hooks/useIngredients";
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
}

interface RecipeIngredient {
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit_of_measure: string;
  ingredient_price: number;
  ingredient_unit: string;
  ingredient_quantity_stock: number;
}

export default function RecipeForm({
  isOpen,
  onClose,
  onSuccess,
  recipe,
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
  const [addAsIngredient, setAddAsIngredient] = useState<boolean>(true);

  const { ingredients } = useIngredients();
  const { register, handleSubmit, reset, setValue } = useForm<CreateRecipe>();

  // Función para convertir unidades a una base común (gramos o mililitros)
  const convertToBaseUnit = (
    quantity: number,
    unit: string,
    targetType: "weight" | "volume"
  ): number => {
    const weightUnits: { [key: string]: number } = {
      kg: 1000,
      g: 1,
    };

    const volumeUnits: { [key: string]: number } = {
      l: 1000,
      ml: 1,
    };

    if (targetType === "weight" && weightUnits[unit]) {
      return quantity * weightUnits[unit];
    }

    if (targetType === "volume" && volumeUnits[unit]) {
      return quantity * volumeUnits[unit];
    }

    return quantity;
  };

  // Calcular el costo de un ingrediente en la receta
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

  // Recalcular costos cuando cambian los ingredientes
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

  // Cargar ingredientes de la receta en modo edición
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
            (item: RecipeIngredientWithRelation) => ({
              ingredient_id: item.ingredients.id,
              ingredient_name: item.ingredients.name,
              quantity: item.quantity,
              unit_of_measure: item.unit_of_measure,
              ingredient_price: item.ingredients.price,
              ingredient_unit: item.ingredients.unit_of_measure,
              ingredient_quantity_stock: item.ingredients.quantity,
            })
          );
          setRecipeIngredients(formattedIngredients);
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
          description: "",
          quantity: 0,
          unit_of_measure: "",
          manufacturing_cost: 0,
        });
        setRecipeIngredients([]);
      }
      setAddAsIngredient(true);
      setSearchIngredient("");
      setSelectedIngredientId(null);
      setIngredientQuantity("");
      setIngredientUnit("");
    }
  }, [isOpen, recipe, reset]);

  if (!isOpen) return null;

  const filteredIngredients = ingredients.filter((ingredient) =>
    ingredient.name.toLowerCase().includes(searchIngredient.toLowerCase())
  );

  const handleSelectIngredient = (id: number, name: string) => {
    setSelectedIngredientId(id);
    setSearchIngredient(name);
    setShowDropdown(false);
  };

  const handleAddIngredient = () => {
    if (!selectedIngredientId || !ingredientQuantity || !ingredientUnit) {
      alert("Por favor completa todos los campos del ingrediente");
      return;
    }

    const selectedIngredient = ingredients.find(
      (ing) => ing.id === selectedIngredientId
    );

    if (!selectedIngredient) return;

    const exists = recipeIngredients.some(
      (item) => item.ingredient_id === selectedIngredientId
    );

    if (exists) {
      alert("Este ingrediente ya está agregado a la receta");
      return;
    }

    const newIngredient: RecipeIngredient = {
      ingredient_id: selectedIngredientId,
      ingredient_name: selectedIngredient.name,
      quantity: parseFloat(ingredientQuantity),
      unit_of_measure: ingredientUnit,
      ingredient_price: selectedIngredient.price,
      ingredient_unit: selectedIngredient.unit_of_measure,
      ingredient_quantity_stock: selectedIngredient.quantity,
    };

    setRecipeIngredients([...recipeIngredients, newIngredient]);

    setSearchIngredient("");
    setSelectedIngredientId(null);
    setIngredientQuantity("");
    setIngredientUnit("");
  };

  const handleRemoveIngredient = (ingredientId: number) => {
    setRecipeIngredients(
      recipeIngredients.filter((item) => item.ingredient_id !== ingredientId)
    );
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
          .eq("id", recipe.id);

        if (error) throw error;
        recipeId = recipe.id;

        // Eliminar ingredientes anteriores
        await supabase
          .from("recipe_ingredients")
          .delete()
          .eq("recipe_id", recipeId);

        // Actualizar el ingrediente en la tabla ingredients
        await supabase
          .from("ingredients")
          .update({
            name: data.name.toLowerCase(),
            quantity: Number(data.quantity),
            unit_of_measure: data.unit_of_measure,
            price: Number(data.manufacturing_cost),
          })
          .eq("name", recipe.name.toLowerCase());
      } else {
        const { data: newRecipe, error } = await supabase
          .from("recipes")
          .insert(recipeData)
          .select()
          .single();

        if (error) throw error;
        recipeId = newRecipe.id;

        // Crear el ingrediente en la tabla ingredients
        if (addAsIngredient) {
          await supabase.from("ingredients").insert({
            name: data.name.toLowerCase(),
            quantity: Number(data.quantity),
            unit_of_measure: data.unit_of_measure,
            price: Number(data.manufacturing_cost),
          });
        }
      }

      // Insertar ingredientes de la receta
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
            {isEditMode ? "Editar Receta" : "Agregar Receta"}
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
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1.5">
              Nombre de la receta <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              {...register("name", {
                required: "El nombre es requerido",
                maxLength: { value: 50, message: "Máximo 50 caracteres" },
              })}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              placeholder="Ej: Fudge"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1.5">
              Descripción de la receta <span className="text-red-600">*</span>
            </label>
            <textarea
              {...register("description", {
                required: "La descripción es requerida",
              })}
              disabled={isSubmitting}
              rows={3}
              className="w-full px-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              placeholder="Ej: Mezclar la leche con la leche condensada..."
            />
          </div>

          {/* Ingredientes */}
          <div className="border border-primary-200 rounded-lg p-4 bg-primary-50/50">
            <label className="block text-sm font-medium text-primary-900 mb-3">
              Ingredientes de la receta <span className="text-red-600">*</span>
            </label>

            <div className="space-y-3">
              {/* Búsqueda de ingrediente */}
              <div className="relative">
                <input
                  type="text"
                  value={searchIngredient}
                  onChange={(e) => {
                    setSearchIngredient(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                  placeholder="Buscar ingrediente..."
                />

                {showDropdown &&
                  searchIngredient &&
                  filteredIngredients.length > 0 && (
                    <ul className="absolute z-20 w-full mt-1 bg-white border border-primary-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredIngredients.map((ingredient) => (
                        <li
                          key={ingredient.id}
                          onClick={() =>
                            handleSelectIngredient(
                              ingredient.id,
                              ingredient.name
                            )
                          }
                          className="px-4 py-2.5 hover:bg-primary-100 cursor-pointer transition-colors capitalize"
                        >
                          {ingredient.name}
                        </li>
                      ))}
                    </ul>
                  )}
              </div>

              {/* Cantidad y Unidad */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1.5">
                    Cantidad <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={ingredientQuantity}
                    onChange={(e) => setIngredientQuantity(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1.5">
                    Unidad <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={ingredientUnit}
                    onChange={(e) => setIngredientUnit(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
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

              {/* Botón agregar ingrediente */}
              <button
                type="button"
                onClick={handleAddIngredient}
                disabled={isSubmitting}
                className="w-full bg-primary-900 py-2.5 text-white rounded-lg hover:bg-primary-800 disabled:bg-gray-400 transition-colors font-medium"
              >
                Agregar ingrediente
              </button>
            </div>

            {/* Lista de ingredientes agregados */}
            {recipeIngredients.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-primary-900 mb-2">
                  Ingredientes agregados ({recipeIngredients.length})
                </h3>
                <div className="bg-white rounded-lg border border-primary-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-primary-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-primary-700 uppercase">
                          Ingrediente
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-primary-700 uppercase">
                          Cantidad
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-primary-700 uppercase">
                          Unidad
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-primary-700 uppercase">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary-200">
                      {recipeIngredients.map((item) => (
                        <tr
                          key={item.ingredient_id}
                          className="hover:bg-primary-50 transition-colors"
                        >
                          <td className="px-4 py-2.5 text-sm text-primary-900 capitalize">
                            {item.ingredient_name}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-primary-900">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-primary-900">
                            {item.unit_of_measure}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveIngredient(item.ingredient_id)
                              }
                              disabled={isSubmitting}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Eliminar ingrediente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Agregar como ingrediente */}
          {!isEditMode && (
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

          {/* Rendimiento de la receta */}
          {addAsIngredient && (
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
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
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
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
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
            </div>
          )}

          {/* Costo de fabricación */}
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
              💡 Este costo se calcula automáticamente sumando los precios de
              todos los ingredientes
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
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
