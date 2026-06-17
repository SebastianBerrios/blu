interface SkeletonProps {
  className?: string;
}

/** Bloque base de carga. Ej: <Skeleton className="h-4 w-32" /> */
export default function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
  );
}

/** Líneas de texto de ancho decreciente. */
export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3.5 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/** Tarjeta genérica (header + líneas) para listas/cards mobile. */
export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-20" />
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

/** Caja de KPI: label corto + número grande. */
export function SkeletonKpi({ className = "" }: SkeletonProps) {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm p-4 ${className}`}>
      <Skeleton className="h-3.5 w-24 mb-3" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

/** Rectángulo alto para gráficos (Chart.js). */
export function SkeletonChart({ className = "h-64" }: SkeletonProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
      <Skeleton className="h-4 w-40 mb-4" />
      <Skeleton className={`w-full ${className}`} />
    </div>
  );
}
