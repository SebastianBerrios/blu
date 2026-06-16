import { describe, it, expect } from "vitest";
import {
  convert,
  dimensionOf,
  areCompatible,
  compatibleUnits,
  normalizeUnit,
} from "./units";

describe("normalizeUnit", () => {
  it("recorta y pasa a minúsculas", () => {
    expect(normalizeUnit("  Rodaja ")).toBe("rodaja");
    expect(normalizeUnit("KG")).toBe("kg");
  });
});

describe("dimensionOf", () => {
  it("clasifica peso, volumen y conteo", () => {
    expect(dimensionOf("kg")).toBe("peso");
    expect(dimensionOf("g")).toBe("peso");
    expect(dimensionOf("l")).toBe("volumen");
    expect(dimensionOf("ml")).toBe("volumen");
    expect(dimensionOf("und")).toBe("conteo");
    expect(dimensionOf("rodaja")).toBe("conteo");
  });
});

describe("convert", () => {
  it("misma unidad devuelve la cantidad", () => {
    expect(convert(5, "und", "und")).toBe(5);
    expect(convert(2, "rodaja", "rodaja")).toBe(2);
  });

  it("convierte peso kg↔g", () => {
    expect(convert(2, "kg", "g")).toBe(2000);
    expect(convert(500, "g", "kg")).toBe(0.5);
  });

  it("convierte volumen l↔ml", () => {
    expect(convert(1.5, "l", "ml")).toBe(1500);
    expect(convert(250, "ml", "l")).toBe(0.25);
  });

  it("devuelve null en dimensiones incompatibles", () => {
    expect(convert(100, "g", "ml")).toBeNull();
    expect(convert(1, "und", "kg")).toBeNull();
    expect(convert(1, "rodaja", "und")).toBeNull();
  });

  it("es insensible a mayúsculas/espacios", () => {
    expect(convert(1, " KG ", "g")).toBe(1000);
  });

  it("con gramsPerUnit hace bridge und↔g↔kg", () => {
    expect(convert(2, "und", "g", 185)).toBe(370); // 2 naranjas = 370 g
    expect(convert(370, "g", "und", 185)).toBe(2);
    expect(convert(10, "g", "und", 10)).toBe(1); // 1 oreo
    expect(convert(1, "und", "kg", 500)).toBe(0.5); // 1 und = 500 g = 0.5 kg
  });

  it("sin gramsPerUnit, und sigue sin convertir a peso", () => {
    expect(convert(2, "und", "g")).toBeNull();
  });
});

describe("areCompatible", () => {
  it("true para misma dimensión, false para incompatibles", () => {
    expect(areCompatible("kg", "g")).toBe(true);
    expect(areCompatible("l", "ml")).toBe(true);
    expect(areCompatible("und", "und")).toBe(true);
    expect(areCompatible("rodaja", "rodaja")).toBe(true);
    expect(areCompatible("g", "ml")).toBe(false);
    expect(areCompatible("und", "g")).toBe(false);
  });
});

describe("compatibleUnits", () => {
  it("peso → kg/g, volumen → l/ml", () => {
    expect(compatibleUnits("kg").map((u) => u.value)).toEqual(["kg", "g"]);
    expect(compatibleUnits("ml").map((u) => u.value)).toEqual(["l", "ml"]);
  });

  it("conteo/personalizada → solo esa unidad", () => {
    expect(compatibleUnits("und").map((u) => u.value)).toEqual(["und"]);
    expect(compatibleUnits("Rodaja").map((u) => u.value)).toEqual(["rodaja"]);
  });

  it("con gramsPerUnit → canónica + peso + und", () => {
    expect(compatibleUnits("kg", 185).map((u) => u.value)).toEqual(["kg", "g", "und"]);
    expect(compatibleUnits("und", 10).map((u) => u.value)).toEqual(["und", "g", "kg"]);
  });
});

describe("areCompatible con factor", () => {
  it("und↔g compatible solo con factor", () => {
    expect(areCompatible("und", "g")).toBe(false);
    expect(areCompatible("und", "g", 185)).toBe(true);
  });
});
