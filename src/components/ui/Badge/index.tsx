import type { ReactNode } from "react";
import { BADGE_STYLES, type Tone } from "./tones";

// Re-export de la fuente de color (sin JSX) para mantener compatibilidad con
// los imports existentes de `@/components/ui/Badge`.
export {
  BADGE_STYLES,
  ORDER_TYPE_TONE,
  PAYMENT_TONE,
  badgeClassName,
} from "./tones";
export type { Tone } from "./tones";

const SIZE_CLASSES = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-xs",
  lg: "px-2.5 py-1 text-xs",
} as const;

interface BadgeProps {
  tone: Tone;
  children: ReactNode;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

/**
 * Pill de color coherente por concepto. El color lo determina `tone`; el
 * contenido (texto y/o íconos) va como `children`.
 */
export default function Badge({
  tone,
  children,
  size = "md",
  className = "",
}: BadgeProps) {
  const s = BADGE_STYLES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${SIZE_CLASSES[size]} ${s.bg} ${s.text} ${className}`}
    >
      {children}
    </span>
  );
}
