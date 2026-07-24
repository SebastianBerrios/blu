/**
 * moduleNav — pure nav resolver unit tests (TDD red → green).
 *
 * Assertions per task 5.1:
 * (a) adminOnly item → only visible when isAdmin: true.
 * (b) mapped configurable item → can() false → hidden.
 * (c) mapped configurable item → can() true → visible.
 * (d) unmapped item → always visible.
 * (e) admin (isAdmin: true) → all mapped items visible regardless of can() return value (branch-1 invariant).
 */
import { describe, it, expect } from "vitest";
import { isNavItemVisible, NAV_MODULE_KEY } from "./moduleNav";
import type { PermissionKey } from "@/types/permissions";

// Helper: a can() function that always returns the given value.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const canAlways = (val: boolean) => (_k: PermissionKey) => val;

describe("NAV_MODULE_KEY", () => {
  it("has exactly 10 entries", () => {
    expect(Object.keys(NAV_MODULE_KEY)).toHaveLength(10);
  });

  it("maps all 10 configurable paths to module.* keys", () => {
    const expected = [
      "/categories",
      "/products",
      "/ingredients",
      "/recipes",
      "/sales",
      "/pedidos",
      "/compras",
      "/inventario",
      "/horario",
      "/actividades",
    ];
    for (const path of expected) {
      expect(NAV_MODULE_KEY[path], `path "${path}" should be mapped`).toBeDefined();
      expect(NAV_MODULE_KEY[path]).toMatch(/^module\./);
    }
  });
});

describe("isNavItemVisible", () => {
  // (a) adminOnly item — only visible for admin
  it("hides adminOnly item for non-admin regardless of can()", () => {
    const item = { nav: "/finanzas", adminOnly: true };
    expect(isNavItemVisible(item, { isAdmin: false, can: canAlways(true) })).toBe(false);
  });

  it("shows adminOnly item for admin (ignores can())", () => {
    const item = { nav: "/finanzas", adminOnly: true };
    expect(isNavItemVisible(item, { isAdmin: true, can: canAlways(false) })).toBe(true);
  });

  // (b) mapped configurable item — hidden when can() is false
  it("hides a mapped configurable item when can() returns false", () => {
    const item = { nav: "/sales" };
    expect(isNavItemVisible(item, { isAdmin: false, can: canAlways(false) })).toBe(false);
  });

  // (c) mapped configurable item — visible when can() is true
  it("shows a mapped configurable item when can() returns true", () => {
    const item = { nav: "/sales" };
    expect(isNavItemVisible(item, { isAdmin: false, can: canAlways(true) })).toBe(true);
  });

  // (d) unmapped item — always visible (non-module paths)
  it("always shows an unmapped item (no module key)", () => {
    const item = { nav: "/some-unknown-path" };
    expect(isNavItemVisible(item, { isAdmin: false, can: canAlways(false) })).toBe(true);
    expect(isNavItemVisible(item, { isAdmin: true, can: canAlways(false) })).toBe(true);
  });

  // (e) admin sees all mapped items regardless of can() — branch-1 invariant
  it("shows all mapped configurable items for admin regardless of can() returning false", () => {
    const mappedPaths = Object.keys(NAV_MODULE_KEY);
    for (const path of mappedPaths) {
      const item = { nav: path };
      expect(
        isNavItemVisible(item, { isAdmin: true, can: canAlways(false) }),
        `admin must see "${path}" even when can() is false`,
      ).toBe(true);
    }
  });

  // BottomNav uses href field — test the href accessor variant
  it("works with href field (BottomNav shape) for mapped paths", () => {
    const item = { href: "/sales" };
    // isNavItemVisible accepts any object with nav or href; adapt: pass nav directly
    // The resolver uses item.nav — BottomNav will pass item.href as the path param.
    // This test verifies the function is generic when called with nav: item.href.
    const nav = item.href;
    const visibleItem = { nav };
    expect(isNavItemVisible(visibleItem, { isAdmin: false, can: canAlways(true) })).toBe(true);
    expect(isNavItemVisible(visibleItem, { isAdmin: false, can: canAlways(false) })).toBe(false);
  });
});
