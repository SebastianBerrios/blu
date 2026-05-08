import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";

interface SetInitialBalancesParams {
  cajaAccountId: number | null;
  bancoAccountId: number | null;
  rappiAccountId: number | null;
  cajaBalance: number | null;
  bancoBalance: number | null;
  rappiBalance: number | null;
  cajaPrevious: number | null;
  bancoPrevious: number | null;
  rappiPrevious: number | null;
  userId: string | null;
  userName: string | null;
}

export async function setInitialBalances(params: SetInitialBalancesParams): Promise<void> {
  const supabase = createClient();

  const updates: { id: number; balance: number; label: string }[] = [];
  if (params.cajaBalance !== null && params.cajaAccountId !== null) {
    updates.push({ id: params.cajaAccountId, balance: params.cajaBalance, label: "Caja" });
  }
  if (params.bancoBalance !== null && params.bancoAccountId !== null) {
    updates.push({ id: params.bancoAccountId, balance: params.bancoBalance, label: "Banco" });
  }
  if (params.rappiBalance !== null && params.rappiAccountId !== null) {
    updates.push({ id: params.rappiAccountId, balance: params.rappiBalance, label: "Rappi" });
  }

  for (const u of updates) {
    if (!Number.isFinite(u.balance) || u.balance < 0) {
      throw new Error(`El saldo de ${u.label} debe ser un número mayor o igual a 0`);
    }
  }

  for (const u of updates) {
    const { error } = await supabase.rpc("adjust_account_balance", {
      p_account_id: u.id,
      p_new_balance: u.balance,
      p_description: `Ajuste de saldo - ${u.label}`,
    });
    if (error) throw error;
  }

  logAudit({
    userId: params.userId,
    userName: params.userName,
    action: "configurar_saldo",
    targetTable: "accounts",
    targetDescription: "Configuración de saldos",
    details: {
      caja: params.cajaBalance ?? undefined,
      banco: params.bancoBalance ?? undefined,
      rappi: params.rappiBalance ?? undefined,
      caja_anterior: params.cajaPrevious ?? undefined,
      banco_anterior: params.bancoPrevious ?? undefined,
      rappi_anterior: params.rappiPrevious ?? undefined,
    },
  });
}
