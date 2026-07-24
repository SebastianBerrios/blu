"use client";

interface ProductFormMobileSubmitProps {
  isSubmitting: boolean;
  submitLabel: string;
}

export default function ProductFormMobileSubmit({
  isSubmitting,
  submitLabel,
}: ProductFormMobileSubmitProps) {
  return (
    /* Mobile submit button */
    <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-white md:hidden">
      <button
        type="submit"
        form="product-form"
        disabled={isSubmitting}
        className="w-full px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </div>
  );
}
