import type { Tables } from "./database";

export type Product = Tables<"products">;

export type ProductComponent = Tables<"product_components">;

// Línea de componente de un combo en el form (con datos del producto para mostrar/sumar).
export interface ProductComponentLine {
  component_product_id: number;
  component_name: string;
  quantity: number;
  unit_cost: number;
}

export interface CreateProduct {
  name: string;
  categoryId: number;
  manufacturing_cost: number;
  suggested_price?: number;
  price: number;
  rappi_price?: number | null;
  temperatura?: string | null;
  tipo_leche?: string | null;
  recipe_id?: number | null;
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
