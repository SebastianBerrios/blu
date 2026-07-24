"use client";

interface ProductFormFooterProps {
  isSubmitting: boolean;
  submitLabel: string;
  onClose: () => void;
}

export default function ProductFormFooter({
  isSubmitting,
  submitLabel,
  onClose,
}: ProductFormFooterProps) {
  return (
    /* Desktop action buttons */
    <div className="hidden md:flex gap-3 pt-4 sticky bottom-0 bg-white pb-2 border-t border-gray-100">
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
  );
}
