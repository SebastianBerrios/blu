// Fuente única de verdad para unidades de medida y conversiones.
// IMPORTANTE: el helper SQL public._convert_qty DEBE reflejar `convert()` (kg/g, l/ml,
// y el bridge und↔g/kg vía gramsPerUnit). Las unidades de conteo/personalizadas
// (und, rodaja, taza…) solo convierten a sí mismas, salvo que se pase gramsPerUnit.

export type UnitDimension = "peso" | "volumen" | "conteo";

export const UNIT_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "l", label: "l" },
  { value: "ml", label: "ml" },
  { value: "und", label: "und" },
] as const;

// Unidades métricas conocidas (factor hacia la unidad base de su dimensión).
const WEIGHT: Record<string, number> = { kg: 1000, g: 1 }; // → g
const VOLUME: Record<string, number> = { l: 1000, ml: 1 }; // → ml

export function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase();
}

export function dimensionOf(unit: string): UnitDimension {
  const u = normalizeUnit(unit);
  if (u in WEIGHT) return "peso";
  if (u in VOLUME) return "volumen";
  return "conteo";
}

/**
 * Convierte `qty` de la unidad `from` a la unidad `to`.
 * - misma unidad → `qty`
 * - kg↔g, l↔ml → factor
 * - con `gramsPerUnit`: `und` vale ese nº de gramos → bridge und↔g↔kg
 * - incompatible (distinta dimensión, o conteo distinto sin factor) → `null`
 */
export function convert(
  qty: number,
  from: string,
  to: string,
  gramsPerUnit?: number | null,
): number | null {
  const f = normalizeUnit(from);
  const t = normalizeUnit(to);
  if (f === t) return qty;
  if (f in WEIGHT && t in WEIGHT) return (qty * WEIGHT[f]) / WEIGHT[t];
  if (f in VOLUME && t in VOLUME) return (qty * VOLUME[f]) / VOLUME[t];

  if (gramsPerUnit != null && gramsPerUnit > 0) {
    // und se trata como `gramsPerUnit` gramos → puente con la familia de peso.
    const toGrams = (u: string): number | null =>
      u === "und" ? gramsPerUnit : u in WEIGHT ? WEIGHT[u] : null;
    const ff = toGrams(f);
    const tf = toGrams(t);
    if (ff != null && tf != null) return (qty * ff) / tf;
  }

  return null;
}

/** ¿Se puede convertir entre estas dos unidades? (con factor opcional) */
export function areCompatible(a: string, b: string, gramsPerUnit?: number | null): boolean {
  return convert(1, a, b, gramsPerUnit) !== null;
}

/**
 * Unidades seleccionables para una línea de receta/compra, dada la unidad del ingrediente.
 * - con `gramsPerUnit` → unidad canónica + familia de peso + und (canónica primero).
 * - sin factor: peso → [kg, g]; volumen → [l, ml]; conteo/personalizada → solo esa unidad.
 */
export function compatibleUnits(
  unit: string,
  gramsPerUnit?: number | null,
): { value: string; label: string }[] {
  const u = normalizeUnit(unit);

  if (gramsPerUnit != null && gramsPerUnit > 0) {
    const values = Array.from(new Set([u, "g", "kg", "und"]));
    return values.map((v) => ({ value: v, label: v }));
  }

  const dim = dimensionOf(unit);
  if (dim === "peso") {
    return [
      { value: "kg", label: "kg" },
      { value: "g", label: "g" },
    ];
  }
  if (dim === "volumen") {
    return [
      { value: "l", label: "l" },
      { value: "ml", label: "ml" },
    ];
  }
  return [{ value: u, label: u }];
}
