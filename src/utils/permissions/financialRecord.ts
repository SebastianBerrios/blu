import { limaDateKey } from "@/utils/helpers/dateFormatters";

export function canEditFinancialRecord(opts: {
  isAdmin: boolean;
  recordUserId: string | null;
  recordDateISO: string | null | undefined;
  currentUserId: string | null | undefined;
}): boolean {
  if (opts.isAdmin) return true;
  if (!opts.recordUserId || !opts.currentUserId) return false;
  if (opts.recordUserId !== opts.currentUserId) return false;
  if (!opts.recordDateISO) return false;
  return limaDateKey(opts.recordDateISO) === limaDateKey();
}

export function canDeleteFinancialRecord(opts: { isAdmin: boolean }): boolean {
  return opts.isAdmin;
}
