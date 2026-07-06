import { ArrowLeft, X } from "lucide-react";

interface SaleFormShellProps {
  title: string;
  onClose: () => void;
  isSubmitting: boolean;
  submitDisabled: boolean;
  submitLabel: string;
  onSubmit: () => void;
  children: React.ReactNode;
}

/**
 * Responsive layout shell for SaleForm. Renders a fullscreen bottom-sheet on
 * mobile and a centred modal on desktop. Owns no form state — just structure.
 */
export default function SaleFormShell({
  title,
  onClose,
  isSubmitting,
  submitDisabled,
  submitLabel,
  onSubmit,
  children,
}: SaleFormShellProps) {
  return (
    <>
      {/* Mobile fullscreen */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <div className="w-11" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">{children}</div>
        <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitDisabled}
            className="w-full px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      </div>

      {/* Desktop modal */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden md:flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl sticky top-0 z-10">
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
          <div className="p-6 space-y-4">
            {children}
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
                type="button"
                onClick={onSubmit}
                disabled={submitDisabled}
                className="flex-1 px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {submitLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
