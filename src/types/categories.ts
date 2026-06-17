import type { Tables } from "./database";

export type Category = Tables<"categories">;

export type CategoryTipo = "postre" | "bebida";

export interface CreateCategory {
  name: string;
  tipo: CategoryTipo | null;
  target_margin: number | null;
}
