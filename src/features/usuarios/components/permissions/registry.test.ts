/**
 * Registry-integrity tests for PERMISSION_DEFS — TDD red→green.
 *
 * Assertions:
 * (a) Exactly 10 keys with prefix "module." exist, all with level:"module" and group:"Módulos".
 * (b) 8 action defs (7 original + action.purchases.use_banco) all have level:"action".
 * (c) Exactly 3 field.* keys exist, all with level:"field" and group:"Campos".
 * (d) PERMISSION_GROUPS includes "Módulos" and "Campos".
 * (e) Sensitive admin-only module keys (finanzas, estadisticas, auditoria, users) are absent.
 * (f) Total def count is 21 (17 original + 3 field.* + 1 action).
 */
import { describe, it, expect } from "vitest";
import { PERMISSION_DEFS, PERMISSION_GROUPS } from "@/types/permissions";

const MODULE_KEYS = [
  "module.categories",
  "module.products",
  "module.ingredients",
  "module.recipes",
  "module.sales",
  "module.pedidos",
  "module.compras",
  "module.inventario",
  "module.horario",
  "module.actividades",
] as const;

const FIELD_KEYS = [
  "field.products.view_cost",
  "field.categories.view_margin",
  "field.recipes.view_cost",
] as const;

const SENSITIVE_KEYS = [
  "module.finanzas",
  "module.estadisticas",
  "module.auditoria",
  "module.users",
];

describe("PERMISSION_DEFS registry integrity", () => {
  it("has exactly 21 total defs", () => {
    expect(PERMISSION_DEFS).toHaveLength(21);
  });

  it("has exactly 10 module.* keys", () => {
    const moduleDefs = PERMISSION_DEFS.filter((d) => d.key.startsWith("module."));
    expect(moduleDefs).toHaveLength(10);
  });

  it("all module.* defs have level:'module'", () => {
    const moduleDefs = PERMISSION_DEFS.filter((d) => d.key.startsWith("module."));
    for (const def of moduleDefs) {
      expect(def.level, `${def.key} should have level:"module"`).toBe("module");
    }
  });

  it("all module.* defs have group:'Módulos'", () => {
    const moduleDefs = PERMISSION_DEFS.filter((d) => d.key.startsWith("module."));
    for (const def of moduleDefs) {
      expect(def.group, `${def.key} should have group:"Módulos"`).toBe("Módulos");
    }
  });

  it("contains exactly the 10 required module keys", () => {
    const moduleKeys = PERMISSION_DEFS.filter((d) => d.key.startsWith("module.")).map((d) => d.key);
    for (const key of MODULE_KEYS) {
      expect(moduleKeys, `expected key "${key}" to be present`).toContain(key);
    }
    expect(moduleKeys).toHaveLength(MODULE_KEYS.length);
  });

  it("has exactly 8 action defs, all with level:'action'", () => {
    const actionDefs = PERMISSION_DEFS.filter((d) => d.level === "action");
    expect(actionDefs).toHaveLength(8);
    for (const def of actionDefs) {
      expect(def.level, `${def.key} should have level:"action"`).toBe("action");
    }
  });

  it("has exactly 3 field.* keys, all with level:'field' and group:'Campos'", () => {
    const fieldDefs = PERMISSION_DEFS.filter((d) => d.key.startsWith("field."));
    expect(fieldDefs).toHaveLength(3);
    for (const def of fieldDefs) {
      expect(def.level, `${def.key} should have level:"field"`).toBe("field");
      expect(def.group, `${def.key} should have group:"Campos"`).toBe("Campos");
    }
  });

  it("contains exactly the 3 required field keys", () => {
    const fieldKeys = PERMISSION_DEFS.filter((d) => d.key.startsWith("field.")).map((d) => d.key);
    for (const key of FIELD_KEYS) {
      expect(fieldKeys, `expected key "${key}" to be present`).toContain(key);
    }
    expect(fieldKeys).toHaveLength(FIELD_KEYS.length);
  });

  it("contains action.purchases.use_banco with level:'action' and group:'Compras'", () => {
    const def = PERMISSION_DEFS.find((d) => d.key === "action.purchases.use_banco");
    expect(def, "action.purchases.use_banco must exist").toBeDefined();
    expect(def?.level).toBe("action");
    expect(def?.group).toBe("Compras");
  });

  it("PERMISSION_GROUPS includes 'Módulos' and 'Campos'", () => {
    expect(PERMISSION_GROUPS).toContain("Módulos");
    expect(PERMISSION_GROUPS).toContain("Campos");
  });

  it("does NOT contain sensitive admin-only module keys", () => {
    const allKeys = PERMISSION_DEFS.map((d) => d.key);
    for (const key of SENSITIVE_KEYS) {
      expect(allKeys, `sensitive key "${key}" must not be in PERMISSION_DEFS`).not.toContain(key);
    }
  });
});
