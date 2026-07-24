import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { TransactionWithUser, TransactionFilters, TransactionType } from "@/types";

const fetchTransactions = async (
  filters: TransactionFilters
): Promise<TransactionWithUser[]> => {
  const supabase = createClient();

  let query = supabase
    .from("transactions")
    .select("*, user_profiles(full_name, email), transaction_categories(name)")
    .order("created_at", { ascending: false });

  if (filters.accountId) {
    query = query.eq("account_id", filters.accountId);
  }
  if (filters.type) {
    query = query.eq("type", filters.type);
  }
  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching transactions:", error);
    throw new Error(error.message);
  }

  return (data || []).map((t) => ({
    ...t,
    user_name:
      (t.user_profiles as unknown as { full_name: string | null; email: string } | null)
        ?.full_name ??
      (t.user_profiles as unknown as { email: string } | null)?.email ??
      null,
    category_name:
      (t.transaction_categories as unknown as { name: string } | null)?.name ?? null,
  }));
};

export const useTransactions = (filters: TransactionFilters = {}) => {
  const { data, error, isLoading, mutate } = useSWR<TransactionWithUser[]>(
    ["transactions", filters],
    () => fetchTransactions(filters)
  );

  return { transactions: data ?? [], error, isLoading, mutate };
};

export async function recordTransaction(params: {
  accountId: number;
  type: TransactionType;
  amount: number;
  description?: string;
  referenceId?: number;
  referenceType?: string;
  categoryId?: number;
}): Promise<number> {
  // Guard: a null/falsy accountId would silently create a transaction with no account.
  // Per project convention: throw early, never forward an invalid id to the RPC.
  if (!params.accountId) {
    throw new Error("recordTransaction: accountId is required and must be a valid non-zero id");
  }
  const supabase = createClient();
  const { data, error } = await supabase.rpc("record_transaction", {
    p_account_id: params.accountId,
    p_type: params.type,
    p_amount: params.amount,
    p_description: params.description ?? null,
    p_reference_id: params.referenceId ?? null,
    p_reference_type: params.referenceType ?? null,
    p_category_id: params.categoryId ?? null,
  });
  if (error) throw error;
  return data;
}
