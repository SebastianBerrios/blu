import type { Tables } from "./database";

export type Production = Tables<"productions">;

/** Producto intermedio producible: un ingrediente con receta + datos de rendimiento. */
export interface Producible {
  ingredient_id: number;
  ingredient_name: string;
  ingredient_unit: string;
  stock_quantity: number;
  recipe_id: number;
  recipe_name: string;
  yield: number;
  yield_unit: string;
}

/** Línea de consumo para el preview de una producción. */
export interface ProductionConsumptionLine {
  ingredient_id: number;
  ingredient_name: string;
  ingredient_unit: string;
  stock_quantity: number;
  /** Cantidad a consumir por un lote, ya convertida a la unidad de stock del ingrediente. */
  per_batch: number;
}

/** Producción con nombres resueltos para el historial. */
export interface ProductionWithNames extends Production {
  ingredient_name: string;
  ingredient_unit: string;
}
