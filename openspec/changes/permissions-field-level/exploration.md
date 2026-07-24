# Exploration: permissions-field-level (Fase 3)

> Artifact store: hybrid. Engram topic key `sdd/permissions-field-level/explore`.
> Date: 2026-07-23. Reuses Fases 1 & 2 (merged/deployed) unchanged.

## Goal
Make hardcoded field-level `isAdmin` gates configurable per role + per-user via the Fase 1 `can()` + tri-state. Add `field.*` keys. **UI-only** (the underlying tables are world-readable; DB column enforcement is out of scope — disproportionate for business-internal cost data).

## Confirmed decisions
- Scope: 3 visibility keys `field.products.view_cost`, `field.categories.view_margin`, `field.recipes.view_cost` + 1 action key `action.purchases.use_banco`.
- Defaults: all OFF for cocinero/barista (behavior-neutral). Admin via branch-1.
- Enforcement: UI-only (no DB/RLS change).

## Field-gate inventory (verified against current code)
| # | File:line | Field | Current gate | View/Edit | New key |
|---|-----------|-------|--------------|-----------|---------|
| F1 | `app/products/page.tsx:151-157` | products cost + suggested_price (columns/dataKeys) | `isAdmin` | VIEW | `field.products.view_cost` |
| F2 | `app/products/page.tsx:257-258` | products cost (mobile card) | `isAdmin` | VIEW | `field.products.view_cost` |
| F3 | `app/products/page.tsx:341,351` | RecipeForm costs via `hidePrice={!isAdmin}` | `hidePrice` | VIEW | `field.recipes.view_cost` |
| F4 | `app/categories/page.tsx:88-89` | categories.target_margin (column/dataKeys) | `isAdmin` | VIEW | `field.categories.view_margin` |
| F5 | `app/categories/page.tsx:109-111` | target_margin (mobile badge) | `isAdmin` | VIEW | `field.categories.view_margin` |
| F6 | `features/compras/components/AccountSelector.tsx:53-68` | "Cuenta Bancaria" option | `isAdmin` (button disabled) | EDIT/action | `action.purchases.use_banco` |
| F8 | `app/recipes/page.tsx:98,117` | recipes.manufacturing_cost (table + card) | **UNGATED (all roles)** | VIEW | `field.recipes.view_cost` (fixes inconsistency) |

Out of Fase 3 scope (stay hardcoded `isAdmin`): F7 `RecipeForm:205` "Add as ingredient" toggle (management action, not a field gate).

## DB exposure (verified — all UI-only)
`products`, `categories`, `ingredients`, `recipes` SELECT are all open to any authenticated user (documented RLS model). A non-admin can read cost/margin via direct PostgREST regardless of UI hiding. So field gates are inherently UI-only; DB enforcement would need column grants (breaks Supabase REST) or projection RPCs — disproportionate for business-internal cost data (not a security threat from employees). **Recommendation: UI-only for all.**

## Taxonomy + groups
- `field.*` keys → new `"Campos"` PermissionGroup; `level: "field"`.
- `action.purchases.use_banco` → existing `"Compras"` group; `level: "action"` (it's an action, not visibility — placing it in Compras keeps the dashboard coherent).
- Adding `"Campos"` to the hardcoded `PermissionGroup` union surfaces it automatically in RoleMatrix/UserOverridePanel via derived `PERMISSION_GROUPS`. Optional `GROUP_HEADING` entry: `Campos: "Acceso a campos de negocio"`.

## Seed defaults (behavior-neutral)
cocinero + barista: `false` for all 4 keys (reproduces today: costs/margin hidden, banco blocked). Admin: no rows (branch-1).

## Consumption pattern
- `products/page.tsx` — already has `usePermissions()`; add `canViewCost = can("field.products.view_cost")`; pass `hidePrice={!can("field.recipes.view_cost")}` to RecipeForm.
- `categories/page.tsx` — already has `usePermissions()`; `can("field.categories.view_margin")`.
- `recipes/page.tsx` — add `can("field.recipes.view_cost")`; gate the cost column/card (fixes F8).
- `RecipeForm` — currently only `useAuth()`; the `hidePrice` prop is driven from the caller (products/page), so RecipeForm itself may not need `usePermissions()` if the caller passes the flag. Verify at design.
- `AccountSelector`/`PurchaseForm` — pass `can("action.purchases.use_banco")` instead of `isAdmin` for the banco option.

## Registry test
`registry.test.ts` asserts 17 defs / 7 action. After Fase 3: 21 defs (17 + 3 field + 1 action), 8 action, 3 field-visibility keys + existing. Update assertions.

## Risks
- F8 behavior change: gating `/recipes` cost behind `field.recipes.view_cost` changes what a cocinero/barista would see IF granted module.recipes (today module.recipes is OFF for them, so latent). Make explicit.
- `RecipeForm` is a 1066-LOC god form — surgical edits only.
- Registry test must be updated in lockstep.

## Open questions for proposal (resolved by confirmed decisions)
- banco placement → `action.purchases.use_banco` in "Compras" (decided).
- /recipes cost → gate under `field.recipes.view_cost` (decided).
- defaults → all OFF (decided).
- hidePrice granularity → keep one boolean per field key (no split) — matches current model.
