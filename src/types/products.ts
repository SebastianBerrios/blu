import type { Tables } from "./database";

export type Product = Tables<"products">;

export interface CreateProduct {
  name: string;
  categoryId: number;
  manufacturing_cost: number;
  suggested_price: number;
  price: number;
}

export interface UpdateProductPrice {
  productId: number;
  newPrice: number;
}

export interface MenuProduct {
  id: number;
  name: string;
  price: number;
  category: string;
  available: boolean;
}
