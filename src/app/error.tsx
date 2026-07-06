"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <div className="h-dvh flex items-center justify-center bg-primary-50 p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center p-4 bg-red-100 rounded-2xl mb-4">
          <AlertTriangle size={40} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-primary-900 mb-2">
          Algo salió mal
        </h1>
        <p className="text-primary-700 mb-6">
          Ocurrió un error inesperado. Por favor intenta de nuevo.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <RefreshCw size={18} />
          Reintentar
        </button>
      </div>
    </div>
  );
}
