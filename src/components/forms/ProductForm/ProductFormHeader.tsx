"use client";

import { X, ArrowLeft } from "lucide-react";

interface ProductFormHeaderProps {
  isEditMode: boolean;
  isSubmitting: boolean;
  onClose: () => void;
}

export default function ProductFormHeader({
  isEditMode,
  isSubmitting,
  onClose,
}: ProductFormHeaderProps) {
  return (
    <>
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
        <h2 className="text-lg font-semibold text-slate-900">
          {isEditMode ? "Editar Producto" : "Nuevo Producto"}
        </h2>
        <div className="w-9" />
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl sticky top-0 z-10">
        <h2 className="text-xl font-semibold text-slate-900">
          {isEditMode ? "Editar Producto" : "Nuevo Producto"}
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
    </>
  );
}
