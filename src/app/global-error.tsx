"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
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
    <html lang="es">
      <body>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f0f9ff",
            padding: "1rem",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "28rem" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem",
                backgroundColor: "#fee2e2",
                borderRadius: "1rem",
                marginBottom: "1rem",
              }}
            >
              <AlertTriangle size={40} color="#ef4444" />
            </div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: "#0c4a6e",
                marginBottom: "0.5rem",
              }}
            >
              Algo salió mal
            </h1>
            <p style={{ color: "#0369a1", marginBottom: "1.5rem" }}>
              Ocurrió un error grave. Por favor recarga la página.
            </p>
            <button
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.625rem 1rem",
                backgroundColor: "#0ea5e9",
                color: "#fff",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              <RefreshCw size={18} />
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
