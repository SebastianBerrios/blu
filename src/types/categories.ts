import type { Tables } from "./database";

export type Category = Tables<"categories">;

export interface CreateCategory {
  name: string;
}
