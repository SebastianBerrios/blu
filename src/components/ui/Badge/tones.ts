import type { OrderType, PaymentMethod } from "@/types";

/**
 * Tono semántico de una etiqueta. Cada tono tiene un color coherente con su
 * marca o significado (Rappi → naranja, Plin → teal, etc.). Es la fuente única
 * de color para los badges de tipo de pedido, método de pago y estado.
 *
 * Vive en un módulo sin JSX para que `constants`/`services` puedan derivar
 * colores sin arrastrar el componente `.tsx` al grafo (respeta la capa
 * types/constants → components, nunca al revés).
 */
export type Tone =
  | "mesa"
  | "paraLlevar"
  | "delivery"
  | "rappi"
  | "efectivo"
  | "plin"
  | "efectivoPlin"
  | "pos"
  | "paymentPending"
  | "prepPending"
  | "delivered"
  | "neutral"
  // Product attribute tones (temperatura, tipo_leche, loyalty_reward)
  | "tempCaliente"
  | "tempFrio"
  | "milkType"
  | "loyaltyDiscount"
  | "loyaltyFree";

export const BADGE_STYLES: Record<
  Tone,
  { bg: string; text: string; border: string }
> = {
  // Tipos de pedido
  mesa: { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-300" },
  paraLlevar: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-300",
  },
  delivery: {
    bg: "bg-violet-100",
    text: "text-violet-700",
    border: "border-violet-300",
  },
  rappi: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-300",
  },
  // Métodos de pago
  efectivo: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-300",
  },
  plin: { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-300" },
  efectivoPlin: {
    // Bicolor verde → teal para el pago mixto
    bg: "bg-gradient-to-r from-green-100 to-teal-100",
    text: "text-slate-700",
    border: "border-teal-300",
  },
  pos: {
    bg: "bg-indigo-100",
    text: "text-indigo-700",
    border: "border-indigo-300",
  },
  // Estados
  paymentPending: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-300",
  },
  prepPending: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-300",
  },
  delivered: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-300",
  },
  neutral: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
  },
  // Product attribute tones
  tempCaliente: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-300",
  },
  tempFrio: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-300",
  },
  milkType: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-300",
  },
  loyaltyDiscount: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-300",
  },
  loyaltyFree: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-300",
  },
};

/** Resuelve el tono a partir del valor de `order_type`. */
export const ORDER_TYPE_TONE: Record<OrderType, Tone> = {
  Mesa: "mesa",
  "Para llevar": "paraLlevar",
  Delivery: "delivery",
  Rappi: "rappi",
};

/** Resuelve el tono a partir del valor de `payment_method`. */
export const PAYMENT_TONE: Record<PaymentMethod, Tone> = {
  Efectivo: "efectivo",
  Plin: "plin",
  "Efectivo + Plin": "efectivoPlin",
  Rappi: "rappi",
  POS: "pos",
};

/**
 * Devuelve el className completo (bg + text + border) de un tono. Útil para
 * elementos que no son un `Badge` (p. ej. botones seleccionables del modal de
 * pago o las opciones de un selector).
 */
export function badgeClassName(tone: Tone): string {
  const s = BADGE_STYLES[tone];
  return `${s.bg} ${s.text} ${s.border}`;
}
