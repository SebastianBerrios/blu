import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { groupByDate } from "@/utils/helpers/groupByDate";
import type { PurchaseWithItems, PurchasesGroupedByDate } from "@/types";

const fetchPurchases = async (
  isAdmin: boolean
): Promise<PurchaseWithItems[]> => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("purchases")
    .select(
      `
      id,
      user_id,
      account_id,
      has_delivery,
      delivery_cost,
      total,
      notes,
      created_at,
      yape_change,
      user_profiles (
        full_name,
        email,
        role
      ),
      purchase_items (
        id,
        item_name,
        ingredient_id,
        price
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching purchases:", error);
    throw new Error(error.message);
  }

  const all = (data || []).map((p) => {
    const profile = p.user_profiles as unknown as {
      full_name: string | null;
      email: string | null;
      role: string | null;
    } | null;

    return {
      ...p,
      purchaser_name: profile?.full_name || profile?.email || null,
      purchaser_role: profile?.role ?? null,
      purchase_items:
        p.purchase_items as unknown as PurchaseWithItems["purchase_items"],
    };
  });

  if (!isAdmin) {
    return all.filter((p) => p.purchaser_role !== "admin");
  }

  return all;
};

export function groupPurchasesByDate(
  purchases: PurchaseWithItems[]
): PurchasesGroupedByDate[] {
  return groupByDate(purchases, (p) => p.created_at).map(({ date, items }) => ({
    date,
    dailyTotal: items.reduce((sum, p) => sum + p.total, 0),
    purchases: items,
  }));
}

export const usePurchases = () => {
  const { isAdmin, isLoading: authLoading } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<PurchaseWithItems[]>(
    authLoading ? null : ["purchases", isAdmin],
    () => fetchPurchases(isAdmin),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  return {
    purchases: data ?? [],
    error,
    isLoading: isLoading || authLoading,
    mutate,
  };
};
