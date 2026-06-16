import useSWR from "swr";
import {
  fetchProducibles,
  fetchRecentProductions,
} from "@/features/inventario/services/productionService";
import type { Producible, ProductionWithNames } from "@/types";

const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
};

export const useProduction = () => {
  const {
    data: producibles,
    error: produciblesError,
    isLoading: produciblesLoading,
    mutate: mutateProducibles,
  } = useSWR<Producible[]>("producibles", fetchProducibles, swrConfig);

  const {
    data: productions,
    error: productionsError,
    isLoading: productionsLoading,
    mutate: mutateProductions,
  } = useSWR<ProductionWithNames[]>(
    "recent-productions",
    () => fetchRecentProductions(20),
    swrConfig,
  );

  return {
    producibles: producibles ?? [],
    productions: productions ?? [],
    isLoading: produciblesLoading || productionsLoading,
    error: produciblesError || productionsError,
    mutateProducibles,
    mutateProductions,
  };
};
