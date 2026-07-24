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

interface TransferParams {
  fromAccount: { id: number; name: string };
  toAccount: { id: number; name: string };
  amount: number;
  description: string;
  userId: string | null;
  userName: string | null;
}

export async function transferBetweenAccounts(params: TransferParams): Promise<void> {
  const supabase = createClient();
  const trimmed = params.description.trim();
  const desc =
    trimmed || `Transferencia ${params.fromAccount.name} → ${params.toAccount.name}`;

  const { error } = await supabase.rpc("transfer_between_accounts", {
    p_from_account_id: params.fromAccount.id,
    p_to_account_id: params.toAccount.id,
    p_amount: params.amount,
    p_description: desc,
  });
  if (error) throw error;

  logAudit({
    userId: params.userId,
    userName: params.userName,
    action: "crear_transaccion",
    targetTable: "transactions",
    targetDescription: `Transferencia ${params.fromAccount.name} → ${params.toAccount.name}: S/ ${params.amount.toFixed(2)}`,
    details: {
      tipo: "transferencia",
      origen: params.fromAccount.name,
      destino: params.toAccount.name,
      monto: params.amount,
      descripcion: trimmed || null,
    },
  });
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
