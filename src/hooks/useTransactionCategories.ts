import useSWR from "swr";
import { getTransactionCategories } from "@/features/finanzas/services/transactionCategoriesService";
import type { TransactionCategory } from "@/types";

export const useTransactionCategories = (opts?: { includeInactive?: boolean }) => {
  const includeInactive = opts?.includeInactive ?? false;
  const { data, error, isLoading, mutate } = useSWR<TransactionCategory[]>(
    ["transaction_categories", includeInactive],
    () => getTransactionCategories({ includeInactive })
  );

  const categories = data ?? [];

  return {
    categories,
    ingresoCategories: categories.filter((c) => c.kind === "ingreso"),
    egresoCategories: categories.filter((c) => c.kind === "egreso"),
    error,
    isLoading,
    mutate,
  };
};
