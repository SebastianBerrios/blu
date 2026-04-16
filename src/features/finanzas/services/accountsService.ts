import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";

interface SetInitialBalancesParams {
  cajaAccountId: number | null;
  bancoAccountId: number | null;
  cajaBalance: number | null;
  bancoBalance: number | null;
  cajaPrevious: number | null;
  bancoPrevious: number | null;
  userId: string | null;
  userName: string | null;
}

export async function setInitialBalances(params: SetInitialBalancesParams): Promise<void> {
  const supabase = createClient();
  const now = new Date().toISOString();

  if (params.cajaBalance !== null && params.cajaAccountId !== null) {
    const { error } = await supabase
      .from("accounts")
      .update({ balance: params.cajaBalance, updated_at: now })
      .eq("id", params.cajaAccountId);
    if (error) throw error;
  }

  if (params.bancoBalance !== null && params.bancoAccountId !== null) {
    const { error } = await supabase
      .from("accounts")
      .update({ balance: params.bancoBalance, updated_at: now })
      .eq("id", params.bancoAccountId);
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
      caja_anterior: params.cajaPrevious ?? undefined,
      banco_anterior: params.bancoPrevious ?? undefined,
    },
  });
}
