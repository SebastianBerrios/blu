"use client";

import { ArrowLeft, X } from "lucide-react";

interface RecipeFormShellProps {
  title: string;
  onClose: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  viewOnly: boolean;
  onFormSubmit: React.FormEventHandler<HTMLFormElement>;
  children: React.ReactNode;
}

/**
 * Responsive layout shell for RecipeForm.
 * Renders a fullscreen bottom-sheet on mobile and a centred modal on desktop.
 * Owns no form state — pure layout. The form element and submit button are
 * rendered here; the form body content is passed as children.
 */
export default function RecipeFormShell({
  title,
  onClose,
  isSubmitting,
  submitLabel,
  viewOnly,
  onFormSubmit,
  children,
}: RecipeFormShellProps) {
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
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <div className="w-9" />
        </div>

        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        {/* Form body */}
        <form
          id="recipe-form"
          onSubmit={onFormSubmit}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4"
        >
          {children}

          {/* Desktop action buttons */}
          <div className="hidden md:flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
            {viewOnly ? (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                Cerrar
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>
        </form>

        {/* Mobile submit button */}
        <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-white md:hidden">
          {viewOnly ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              Cerrar
            </button>
          ) : (
            <button
              type="submit"
              form="recipe-form"
              disabled={isSubmitting}
              className="w-full px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {submitLabel}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
