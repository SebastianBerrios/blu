/**
 * Registry-integrity tests for PERMISSION_DEFS — TDD red→green.
 *
 * Assertions:
 * (a) Exactly 10 keys with prefix "module." exist, all with level:"module" and group:"Módulos".
 * (b) The original 7 action defs all have level:"action".
 * (c) PERMISSION_GROUPS includes "Módulos".
 * (d) Sensitive admin-only module keys (finanzas, estadisticas, auditoria, users) are absent.
 * (e) Total def count is 17.
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

const SENSITIVE_KEYS = [
  "module.finanzas",
  "module.estadisticas",
  "module.auditoria",
  "module.users",
];

describe("PERMISSION_DEFS registry integrity", () => {
  it("has exactly 17 total defs", () => {
    expect(PERMISSION_DEFS).toHaveLength(17);
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

  it("original 7 action defs all have level:'action'", () => {
    const actionDefs = PERMISSION_DEFS.filter((d) => !d.key.startsWith("module."));
    expect(actionDefs).toHaveLength(7);
    for (const def of actionDefs) {
      expect(def.level, `${def.key} should have level:"action"`).toBe("action");
    }
  });

  it("PERMISSION_GROUPS includes 'Módulos'", () => {
    expect(PERMISSION_GROUPS).toContain("Módulos");
  });

  it("does NOT contain sensitive admin-only module keys", () => {
    const allKeys = PERMISSION_DEFS.map((d) => d.key);
    for (const key of SENSITIVE_KEYS) {
      expect(allKeys, `sensitive key "${key}" must not be in PERMISSION_DEFS`).not.toContain(key);
    }
  });
});
