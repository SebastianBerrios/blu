/**
 * Normaliza texto para búsqueda insensible a mayúsculas y a tildes/diacríticos.
 * Quita todos los diacríticos (incluida la ñ → n) usando descomposición NFD,
 * removiendo el rango de combining marks U+0300–U+036F.
 * Ej: "Limón" → "limon", "Piña" → "pina".
 */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
