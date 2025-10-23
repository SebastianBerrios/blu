import type { Tables } from "./database";

export type Customer = Tables<"customers">;

export interface CreateCustomer {
  name?: string;
  dni?: string;
  phone?: string;
}
