import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { round2 } from "@/features/ventas/utils/discount";
import type { EmployeeBalance } from "@/types";

/**
 * Aggregates extra-hours ledger entries into per-employee balances.
 * Pure and testable. Hours are fractional (0.5, 0.25, …), so raw float
 * accumulation leaks noise (e.g. 0.1 + 0.2 = 0.30000000000000004) into a
 * balance rendered verbatim in the UI. round2 clamps each running total.
 */
export function computeExtraHoursBalances(
  entries: { user_id: string; user_name: string | null; hours: number }[],
): EmployeeBalance[] {
  const map = new Map<
    string,
    { name: string; credits: number; debits: number }
  >();

  for (const entry of entries) {
    const existing = map.get(entry.user_id) ?? {
      name: entry.user_name ?? "Sin nombre",
      credits: 0,
      debits: 0,
    };

    if (entry.hours > 0) {
      existing.credits += entry.hours;
    } else {
      existing.debits += Math.abs(entry.hours);
    }

    map.set(entry.user_id, existing);
  }

  return Array.from(map.entries()).map(([userId, info]) => {
    const credits = round2(info.credits);
    const debits = round2(info.debits);
    return {
      user_id: userId,
      user_name: info.name,
      user_role: "",
      total_credits: credits,
      total_debits: debits,
      balance: round2(credits - debits),
    };
  });
}

export async function createExtraHoursEntry(params: {
  userId: string;
  hours: number;
  type: "credit" | "debit";
  description: string;
  adminId: string;
  adminName: string | null;
  employeeName: string;
}): Promise<void> {
  const supabase = createClient();
  const finalHours = params.type === "debit" ? -params.hours : params.hours;
  const { error } = await supabase.from("extra_hours_log").insert({
    user_id: params.userId,
    hours: finalHours,
    description: params.description,
    reference_type: "manual",
    created_by: params.adminId,
  });
  if (error) throw error;

  logAudit({
    userId: params.adminId,
    userName: params.adminName,
    action: "registrar_horas_extra",
    targetTable: "extra_hours_log",
    targetDescription: `${params.type === "debit" ? "-" : "+"}${params.hours}h para ${params.employeeName}: ${params.description}`,
  });
}
