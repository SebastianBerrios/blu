import type { AccountType } from "@/types";

interface AccountMeta {
  label: string;
  /** Classes for the read-only account indicator (bg + text + border) */
  classes: string;
}

const ACCOUNT_META: Record<AccountType, AccountMeta> = {
  caja: { label: "Caja", classes: "bg-green-100 text-green-700 border-green-300" },
  banco: { label: "Cuenta Bancaria", classes: "bg-blue-100 text-blue-700 border-blue-300" },
  rappi: { label: "Rappi", classes: "bg-orange-100 text-orange-700 border-orange-300" },
  pos: { label: "POS", classes: "bg-indigo-100 text-indigo-700 border-indigo-300" },
};

const FALLBACK_META: AccountMeta = {
  label: "Cuenta",
  classes: "bg-slate-100 text-slate-700 border-slate-300",
};

export function accountMeta(type: string | null | undefined): AccountMeta {
  return ACCOUNT_META[type as AccountType] ?? FALLBACK_META;
}
