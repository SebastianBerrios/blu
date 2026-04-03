import type { PaymentMethod } from "@/types";

export const ORDER_TYPES = [
  {
    value: "Mesa",
    label: "Mesa",
    color: "bg-blue-100 text-blue-700 border-blue-300",
  },
  {
    value: "Para llevar",
    label: "Para llevar",
    color: "bg-amber-100 text-amber-700 border-amber-300",
  },
  {
    value: "Delivery",
    label: "Delivery",
    color: "bg-green-100 text-green-700 border-green-300",
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
    color: "bg-green-100 text-green-700 border-green-300",
  },
  {
    value: "Yape",
    label: "Yape",
    color: "bg-purple-100 text-purple-700 border-purple-300",
  },
  {
    value: "Efectivo + Yape",
    label: "Efectivo + Yape",
    color: "bg-indigo-100 text-indigo-700 border-indigo-300",
  },
];
