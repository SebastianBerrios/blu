import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { Product } from "@/types";

const fetchProducts = async () => {
  const supabase = createClient();

  const { data, error } = await supabase.from("products").select();

  if (error) {
    console.error("Error fetching products:", error);
    throw new Error(error.message);
  }

  return data || [];
};

export const useProducts = () => {
  const { data, error, isLoading, mutate } = useSWR<Product[]>(
    "products",
    fetchProducts,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  return { products: data ?? [], error, isLoading, mutate };
};
