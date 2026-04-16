"use client";

interface AddAsIngredientToggleProps {
  addAsIngredient: boolean;
  onToggle: () => void;
  isSubmitting: boolean;
}

export default function AddAsIngredientToggle({
  addAsIngredient,
  onToggle,
  isSubmitting,
}: AddAsIngredientToggleProps) {
  return (
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
        onClick={onToggle}
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
  );
}
