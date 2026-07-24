import type { AccountType } from "@/types";
import { Banknote, Bike, Building2, CreditCard, type LucideIcon } from "lucide-react";

interface AccountMeta {
  /** Full display label (e.g. "Cuenta Bancaria"). */
  label: string;
  /** Short label for chips and filters (e.g. "Banco"). */
  shortLabel: string;
  /** Lucide icon for the account. */
  Icon: LucideIcon;
  /** Read-only account indicator pill: bg + text + border. */
  classes: string;
  /** Soft card border (per-account breakdown). */
  softBorder: string;
  /** Soft card background (per-account breakdown). */
  softBg: string;
  /** Icon tint. */
  iconColor: string;
  /** Chip: bg + text. */
  chipClasses: string;
  /** Accent bar for transaction rows. */
  accentBar: string;
}

const ACCOUNT_META: Record<AccountType, AccountMeta> = {
  caja: {
    label: "Caja",
    shortLabel: "Caja",
    Icon: Banknote,
    classes: "bg-green-100 text-green-700 border-green-300",
    softBorder: "border-green-200",
    softBg: "bg-green-50/60",
    iconColor: "text-green-700",
    chipClasses: "bg-green-100 text-green-800",
    accentBar: "bg-green-400",
  },
  banco: {
    label: "Cuenta Bancaria",
    shortLabel: "Banco",
    Icon: Building2,
    classes: "bg-blue-100 text-blue-700 border-blue-300",
    softBorder: "border-blue-200",
    softBg: "bg-blue-50/60",
    iconColor: "text-blue-700",
    chipClasses: "bg-blue-100 text-blue-800",
    accentBar: "bg-blue-400",
  },
  rappi: {
    label: "Rappi",
    shortLabel: "Rappi",
    Icon: Bike,
    classes: "bg-orange-100 text-orange-700 border-orange-300",
    softBorder: "border-orange-200",
    softBg: "bg-orange-50/60",
    iconColor: "text-orange-700",
    chipClasses: "bg-orange-100 text-orange-800",
    accentBar: "bg-orange-400",
  },
  pos: {
    label: "POS",
    shortLabel: "POS",
    Icon: CreditCard,
    classes: "bg-indigo-100 text-indigo-700 border-indigo-300",
    softBorder: "border-indigo-200",
    softBg: "bg-indigo-50/60",
    iconColor: "text-indigo-700",
    chipClasses: "bg-indigo-100 text-indigo-800",
    accentBar: "bg-indigo-400",
  },
};

const FALLBACK_META: AccountMeta = {
  label: "Cuenta",
  shortLabel: "Cuenta",
  Icon: Banknote,
  classes: "bg-slate-100 text-slate-700 border-slate-300",
  softBorder: "border-slate-200",
  softBg: "bg-slate-50/60",
  iconColor: "text-slate-700",
  chipClasses: "bg-slate-100 text-slate-800",
  accentBar: "bg-slate-400",
};

export function accountMeta(type: string | null | undefined): AccountMeta {
  return ACCOUNT_META[type as AccountType] ?? FALLBACK_META;
}
