import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import type {
  TransactionCategory,
  CreateTransactionCategory,
} from "@/types";

interface AuditActor {
  userId: string | null;
  userName: string | null;
}

export async function getTransactionCategories(
  opts?: { includeInactive?: boolean }
): Promise<TransactionCategory[]> {
  const supabase = createClient();
  let query = supabase
    .from("transaction_categories")
    .select("*")
    .order("kind")
    .order("name");

  if (!opts?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching transaction categories:", error);
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function createTransactionCategory(
  input: CreateTransactionCategory,
  actor: AuditActor
): Promise<TransactionCategory> {
  const name = input.name.trim();
  if (!name) throw new Error("Ingresa un nombre de categoría");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("transaction_categories")
    .insert({ name, kind: input.kind })
    .select("*")
    .single();
  if (error) throw error;

  logAudit({
    userId: actor.userId,
    userName: actor.userName,
    action: "crear",
    targetTable: "transaction_categories",
    targetId: data.id,
    targetDescription: `Categoría ${input.kind}: ${name}`,
  });

  return data;
}

export async function updateTransactionCategory(
  id: number,
  input: { name: string },
  actor: AuditActor
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("Ingresa un nombre de categoría");

  const supabase = createClient();
  const { error } = await supabase
    .from("transaction_categories")
    .update({ name })
    .eq("id", id);
  if (error) throw error;

  logAudit({
    userId: actor.userId,
    userName: actor.userName,
    action: "actualizar",
    targetTable: "transaction_categories",
    targetId: id,
    targetDescription: `Renombrar categoría a: ${name}`,
  });
}

export async function setTransactionCategoryActive(
  id: number,
  isActive: boolean,
  actor: AuditActor
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("transaction_categories")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;

  logAudit({
    userId: actor.userId,
    userName: actor.userName,
    action: "actualizar",
    targetTable: "transaction_categories",
    targetId: id,
    targetDescription: isActive ? "Reactivar categoría" : "Desactivar categoría",
  });
}
