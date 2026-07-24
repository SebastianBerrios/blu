import useSWR from "swr";
import {
  fetchProducibles,
  fetchRecentProductions,
} from "@/features/inventario/services/productionService";
import type { Producible, ProductionWithNames } from "@/types";

export const useProduction = () => {
  const {
    data: producibles,
    error: produciblesError,
    isLoading: produciblesLoading,
    mutate: mutateProducibles,
  } = useSWR<Producible[]>("producibles", fetchProducibles);

  const {
    data: productions,
    error: productionsError,
    isLoading: productionsLoading,
    mutate: mutateProductions,
  } = useSWR<ProductionWithNames[]>(
    "recent-productions",
    () => fetchRecentProductions(20),
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
