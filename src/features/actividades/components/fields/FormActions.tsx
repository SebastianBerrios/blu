interface FormActionsProps {
  onClose: () => void;
  isSubmitting: boolean;
  isEditMode: boolean;
}

export default function FormActions({ onClose, isSubmitting, isEditMode }: FormActionsProps) {
  return (
    <div className="flex gap-3 pt-2">
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
        {isSubmitting ? "Guardando..." : isEditMode ? "Actualizar" : "Guardar"}
      </button>
    </div>
  );
}
