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
  const recordDay = new Date(opts.recordDateISO).toDateString();
  const today = new Date().toDateString();
  return recordDay === today;
}

export function canDeleteFinancialRecord(opts: { isAdmin: boolean }): boolean {
  return opts.isAdmin;
}
