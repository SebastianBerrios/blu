/**
 * Shared accent palette for balance cards and KPI cards.
 * JSX-free so services/constants can import it without breaking the
 * oxc transform (per constants_no_tsx_imports pattern).
 *
 * Used by:
 *  - src/features/finanzas/components/BalanceCard.tsx
 *  - src/features/estadisticas/components/KPICard.tsx
 */

export type BalanceAccent = "green" | "blue" | "orange" | "indigo";

export type KPIAccent =
  | "green"
  | "blue"
  | "purple"
  | "amber"
  | "primary"
  | "emerald";

/** Palette for BalanceCard (Caja, Banco, Rappi, POS). */
export const BALANCE_ACCENT_STYLES: Record<
  BalanceAccent,
  { border: string; bg: string; icon: string; label: string; value: string }
> = {
  green: {
    border: "border-green-200",
    bg: "bg-green-50",
    icon: "text-green-700",
    label: "text-green-800",
    value: "text-green-900",
  },
  blue: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    icon: "text-blue-700",
    label: "text-blue-800",
    value: "text-blue-900",
  },
  indigo: {
    border: "border-indigo-200",
    bg: "bg-indigo-50",
    icon: "text-indigo-700",
    label: "text-indigo-800",
    value: "text-indigo-900",
  },
  orange: {
    border: "border-orange-200",
    bg: "bg-orange-50",
    icon: "text-orange-700",
    label: "text-orange-800",
    value: "text-orange-900",
  },
};

/** Palette for KPICard (estadisticas). */
export const KPI_ACCENT_STYLES: Record<
  KPIAccent,
  { bg: string; border: string; text: string; icon: string; spark: string; sparkFill: string }
> = {
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    icon: "text-green-600",
    spark: "#16a34a",
    sparkFill: "rgba(22,163,74,0.15)",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: "text-blue-600",
    spark: "#2563eb",
    sparkFill: "rgba(37,99,235,0.15)",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-800",
    icon: "text-purple-600",
    spark: "#7c3aed",
    sparkFill: "rgba(124,58,237,0.15)",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: "text-amber-600",
    spark: "#d97706",
    sparkFill: "rgba(217,119,6,0.15)",
  },
  primary: {
    bg: "bg-primary-50",
    border: "border-primary-200",
    text: "text-primary-800",
    icon: "text-primary-600",
    spark: "#0369a1",
    sparkFill: "rgba(3,105,161,0.15)",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    icon: "text-emerald-600",
    spark: "#059669",
    sparkFill: "rgba(5,150,105,0.15)",
  },
};
