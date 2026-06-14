import type { OrderType, PaymentMethod } from "@/types";
import {
  ORDER_TYPE_TONE,
  PAYMENT_TONE,
  badgeClassName,
} from "@/components/ui/Badge/tones";

export const RAPPI_COMMISSION_RATE = 0.2;
export const RAPPI_SUGGESTED_PRICE_MULTIPLIER = 1.3;
export const POS_COMMISSION_RATE = 0.0344;

// Colores derivados de la fuente única en components/ui/Badge para mantener
// coherencia entre los selectores y los badges renderizados.
export const ORDER_TYPES: { value: OrderType; label: string; color: string }[] =
  [
    { value: "Mesa", label: "Mesa", color: badgeClassName(ORDER_TYPE_TONE.Mesa) },
    {
      value: "Para llevar",
      label: "Para llevar",
      color: badgeClassName(ORDER_TYPE_TONE["Para llevar"]),
    },
    {
      value: "Delivery",
      label: "Delivery",
      color: badgeClassName(ORDER_TYPE_TONE.Delivery),
    },
    {
      value: "Rappi",
      label: "Rappi",
      color: badgeClassName(ORDER_TYPE_TONE.Rappi),
    },
  ];

export const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  color: string;
}[] = [
  {
    value: "Efectivo",
    label: "Efectivo",
    color: badgeClassName(PAYMENT_TONE.Efectivo),
  },
  { value: "Plin", label: "Plin", color: badgeClassName(PAYMENT_TONE.Plin) },
  {
    value: "Efectivo + Plin",
    label: "Efectivo + Plin",
    color: badgeClassName(PAYMENT_TONE["Efectivo + Plin"]),
  },
  {
    value: "POS",
    label: "POS",
    color: badgeClassName(PAYMENT_TONE.POS),
  },
  {
    value: "Rappi",
    label: "Rappi",
    color: badgeClassName(PAYMENT_TONE.Rappi),
  },
];
