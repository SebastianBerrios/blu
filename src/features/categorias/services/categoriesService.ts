import { createClient } from "@/utils/supabase/client";
import { deleteWithAudit } from "@/utils/helpers/deleteWithAudit";
import type { CreateCategory } from "@/types";

interface CategoryWrite {
  name: string;
  tipo: "postre" | "bebida" | null;
}

export function buildCategoryPayload(data: CreateCategory): CategoryWrite {
  const rawTipo = data.tipo as unknown as string | null;
  const tipo: "postre" | "bebida" | null =
    rawTipo === "postre" || rawTipo === "bebida" ? rawTipo : null;
  return {
    name: data.name.toLowerCase(),
    tipo,
  };
}

export async function createCategory(payload: CategoryWrite): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("categories").insert(payload);
  if (error) throw error;
}

export async function updateCategory(id: number, payload: CategoryWrite): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("categories").update(payload).eq("id", id);
  if (error) throw error;
}

interface DeleteCategoryParams {
  id: number;
  name: string;
  userId: string | null;
  userName: string | null;
}

export async function deleteCategory(params: DeleteCategoryParams): Promise<void> {
  await deleteWithAudit({
    table: "categories",
    id: params.id,
    userId: params.userId,
    userName: params.userName,
    auditTable: "categories",
    description: `Categoría eliminada: ${params.name}`,
  });
}
