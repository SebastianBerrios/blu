# Proposal: permissions-module-access (Fase 2)

> Artifact store: hybrid (this file + engram `sdd/permissions-module-access/proposal`).
> Date: 2026-07-23. Reads: `exploration.md` (authoritative) + engram `sdd/permissions-module-access/explore` (id 158); Fase 1 `permissions-full-control/design.md` (REUSE foundation).
> Scope: propose the change only — specs/design/tasks follow in later phases.

## 1. Problem statement

Blu's permission system (Fase 1, merged) can configure **action-level** permissions (delete a sale, adjust stock, produce a batch) per role with per-user tri-state overrides. But **which modules a user can even open** is still governed by a hardcoded `adminOnly` boolean on each nav item plus per-page `redirect()` guards. This has three concrete problems today:

1. **Module access is not configurable.** An admin cannot let a `barista` see `/recipes`, or hide `/compras` from a `cocinero`, without a code change. The whole app is "all-role except a fixed admin-only set", with no middle ground and no per-user tuning — even though the Fase 1 tri-state resolver already exists and would handle this natively.
2. **URL-bypass on sensitive pages.** Nav hiding via `adminOnly` is UI-only. Middleware is auth-only (verified: `src/middleware.ts` → `updateSession`, zero role awareness). A non-admin who types `/finanzas`, `/auditoria`, or `/users` is stopped only by an in-page `redirect()`, and **`/estadisticas` has no such guard at all** — any authenticated user who navigates there sees financial statistics sourced from `transactions`. (This specific gap was hotfixed and MERGED to main in PR #4; see §7 — it is the prerequisite that unblocks `transactions` RLS hardening, not a task of this change.)
3. **Financial data is world-readable at the data layer.** `transactions` and `accounts` SELECT policies are currently `qual: true` for any authenticated user. Even with UI gating, a non-admin can read every account balance and every transaction directly via the Supabase client. UI redirects do not protect the data — only RLS does.

## 2. Goals

- Add **10 `module.*` visibility keys** for the configurable modules and wire them through the existing Fase 1 stack (`PERMISSION_DEFS` registry → `has_permission` / `resolvePermission` → `usePermissions().can()` → dashboard), so module access becomes role-configurable AND per-user overridable using the primitives already shipped.
- Enforce module access consistently at **three layers**: nav filtering (SideBar/BottomNav), page-level `can("module.*")` guards, and server-side **middleware role check** for the 4 permanently-admin paths (Option C) to close the URL bypass.
- **Roll out behavior-neutral**: seed role defaults that reproduce today's access exactly, so no user gains or loses a module the moment enforcement ships.
- **Harden financial RLS**: restrict `transactions` and `accounts` SELECT to admin, with a narrow `get_payment_accounts()` RPC so non-admin payment flows keep working without exposing balances.

## 3. Non-goals

- **Field-level permission control** (e.g. hide the cost column but show the row) — that is **Fase 3**. This change only adds a `level` discriminator to the registry to make Fase 3 mechanical; it does not implement field gating.
- **Making finanzas / estadisticas / auditoria / users configurable.** These 4 stay **hardcoded admin-only forever** — no `module.*` key, no dashboard toggle, never delegatable.
- **Changing the tri-state override model or the 4-branch resolution order.** Fase 1's `user_permissions` row-presence tri-state, `resolvePermission`, and the mirrored `has_permission` SQL are REUSED as-is, unchanged.
- **Full server-side enforcement of configurable modules** (a `has_permission` RPC call in middleware per request — Option A). Rejected for latency; configurable modules use page-level `can()` which already honors per-user overrides. The data layer (RLS on writes) remains the real security boundary for those modules.
- **DB-level RLS gating of ingredient/recipe reads** by `module.*` key. Out of scope; those modules stay UI-gated (their RLS is unchanged from Fase 1).

## 4. Approach

Extend the Fase 1 stack in place (no new patterns) across three work areas. Each area maps cleanly to one PR (§8).

### Area A — Registry + seed migration + dashboard "Módulos" section

- **Registry (`src/types/permissions.ts`):**
  - Add `"Módulos"` to the **hardcoded** `PermissionGroup` union (verified line 7 is a literal union; `PERMISSION_GROUPS` on line 68 is derived and will pick it up automatically — no change there).
  - Add a `level: "module" | "action" | "field"` discriminator to `PermissionDef`. Existing 7 action keys get `level: "action"`; the 10 new keys get `level: "module"`. This lets the dashboard render module toggles as a distinct "Acceso a módulos" section and is the seam Fase 3 (`"field"`) plugs into.
  - Add the 10 `module.*` keys to `PERMISSION_DEFS`: `module.categories`, `module.products`, `module.ingredients`, `module.recipes`, `module.sales`, `module.pedidos`, `module.compras`, `module.inventario`, `module.horario`, `module.actividades` — all `group: "Módulos"`, `level: "module"`. `PermissionKey` (derived) picks them up automatically.
- **Seed migration (`role_permissions`), behavior-neutral:** for **both** `cocinero` and `barista`, seed `enabled=true` for `module.{categories,products,sales,pedidos,compras,inventario,horario,actividades}` (currently all-role) and `enabled=false` for `module.{ingredients,recipes}` (currently admin-only redirect). Admin never gets rows (branch-1 invariant covers admin). This migration MUST land and deploy **before** any enforcement code (§ ordering).
- **Dashboard (`features/usuarios/components/permissions/`):** `RoleMatrix` and `UserOverridePanel` group by `level` so `module`-level defs render under an "Acceso a módulos" heading separate from action permissions. No new components — presentational changes to the two existing children driven by the `level` field.

### Area B — Enforcement (nav + page guards + middleware Option C)

- **Nav (`SideBar`, `BottomNav`):** replace the `!item.adminOnly || isAdmin` filter with a resolver: items for the 4 sensitive paths keep `adminOnly` (show only to admin); every configurable item is shown when `can("module.<name>")` is true. The path→key mapping is a small static map. `can()` already returns `true` for admins (branch-1) so admins see everything.
- **Page guards (~10 `page.tsx`):** each configurable page adds a `can("module.<name>")` guard mirroring the existing `finanzas` admin-guard pattern (`const { isLoading } = usePermissions(); if (!isLoading && !can("module.x")) redirect("/")`). `ingredients` and `recipes` swap their current `isAdmin` redirect for the `can()` guard (default OFF preserves admin-only behavior day one).
- **Middleware Option C (`src/middleware.ts` + `src/utils/supabase/middleware.ts`):** after the existing auth check, for requests whose path is one of the 4 protected prefixes (`/finanzas`, `/estadisticas`, `/auditoria`, `/users`), do **one** `user_profiles.role` lookup and redirect non-admins to `/`. Configurable paths are untouched by middleware (page-level `can()` owns them). This closes the URL bypass for the sensitive 4 with a single query only on those paths.

### Area C — Financial RLS hardening (`get_payment_accounts()` → wire payment flows → restrict SELECT)

- **`transactions` SELECT → admin-only.** Safe to do directly: the estadisticas guard (the only non-admin read path) is already merged (PR #4). `recordTransaction` is a SECURITY DEFINER write RPC — unaffected.
- **`accounts` SELECT → admin-only, but not before payment flows are rewired.** Verified non-admin readers of `useAccounts()`: `PaymentModal`, `SaleForm` (`/sales`), `PurchaseForm` + `AccountSelector` (`/compras`) — they need account **IDs** to pass to `record_transaction`. Prerequisite: new narrow `SECURITY DEFINER` RPC **`get_payment_accounts()`** returning `{id, type, name}` (**NO balance**), granted to `authenticated`, REVOKE from `anon`. Rewire the non-admin payment flows (via `useAccounts()` or a new `usePaymentAccounts()`) to call the RPC; keep admin finanzas pages on the direct `accounts` SELECT. **Then** restrict `accounts` SELECT to admin. `name` is included because `AccountSelector` displays it.

## 5. Affected files

| Area | Files |
|------|-------|
| A — registry/types | `src/types/permissions.ts` (union + `level` + 10 keys) |
| A — seed | new migration `supabase/migrations/<ts>_seed_module_permission_defaults.sql` |
| A — dashboard | `src/features/usuarios/components/permissions/RoleMatrix.tsx`, `UserOverridePanel.tsx` |
| B — nav | `src/components/SideBar/index.tsx`, `src/components/ui/BottomNav/index.tsx` |
| B — page guards | `src/app/{categories,products,ingredients,recipes,sales,pedidos,compras,inventario,horario,actividades}/page.tsx` (~10) |
| B — middleware | `src/middleware.ts`, `src/utils/supabase/middleware.ts` |
| C — RPC + RLS | new migration `supabase/migrations/<ts>_get_payment_accounts_and_harden_financial_rls.sql` |
| C — payment flows | `src/hooks/useAccounts.ts` (or new `usePaymentAccounts`), `src/components/forms/PaymentModal/index.tsx`, `src/components/forms/SaleForm/index.tsx`, `src/components/forms/PurchaseForm/index.tsx`, `src/features/compras/components/AccountSelector.tsx` |
| C — types regen | `src/types/database.ts` (regenerate after migrations for `get_payment_accounts` return type) |

## 6. Security invariants (must hold after this change)

1. **Admin always has everything.** Branch-1 short-circuit means no `role_permissions`/`user_permissions` row can grant or revoke an admin; admins see every nav item and pass every page/middleware guard.
2. **The 4 sensitive modules are never delegatable.** `finanzas`, `estadisticas`, `auditoria`, `users` have no `module.*` key, so nothing in the dashboard can grant them; enforced by nav `adminOnly` + page redirect + middleware role check.
3. **Force-OFF denies.** A per-user `module.*` override with `enabled=false` hides the nav item and blocks the page even if the role default is ON (branch-2 existence check from Fase 1, unchanged).
4. **Middleware closes the URL bypass for the 4.** Direct navigation to any of the 4 protected paths by a non-admin is redirected server-side before the page renders — not merely hidden in nav.
5. **Financial data is no longer world-readable.** After Area C, non-admins cannot SELECT `transactions` or `accounts`; they obtain only `{id, type, name}` (no balances) via `get_payment_accounts()`, exactly what payment registration needs.

## 7. Ordering / safety (must be spelled out to apply)

Two orderings are load-bearing and non-negotiable:

1. **Seed BEFORE enforcement.** The `role_permissions` seed for the 10 `module.*` keys must be deployed **before** the nav/page/middleware enforcement code ships. If enforcement lands first, every configurable module resolves to branch-4 default-deny for non-admins and they instantly lose access to sales, compras, inventario, etc. Seed → verify defaults reproduce today's access → then enforce.
2. **`get_payment_accounts()` + payment-flow rewiring BEFORE `accounts` SELECT restriction.** The RPC must exist and the non-admin flows (`PaymentModal`, `SaleForm`, `PurchaseForm`/`AccountSelector`) must be reading from it **before** `accounts` SELECT is locked to admin. Reverse order breaks payment registration for every non-admin. Within Area C: create RPC → rewire flows → verify non-admin can still register a payment → then restrict `accounts` SELECT. `transactions` SELECT restriction has no such dependency (estadisticas guard already merged, PR #4) and can be applied directly.

## 8. Review Workload Forecast + PR slicing

**Estimated total > 400 changed lines → chained PRs recommended: Yes.** (~10 page guards + 2 nav files + middleware + registry + 2 migrations + dashboard + 5 payment-flow files.) `size:exception` is not appropriate — the change has natural, safe cut points that also enforce the §7 orderings.

| PR | Scope | Behavior on merge | Depends on |
|----|-------|-------------------|-----------|
| **PR1** | Area A: registry (`level` + `"Módulos"` + 10 keys) + seed migration + dashboard "Módulos" section | **Behavior-neutral.** Keys exist, defaults seeded, dashboard shows module toggles. No enforcement yet — nav/pages still use `adminOnly`. | — |
| **PR2** | Area B: nav resolver + ~10 page `can()` guards + middleware Option C | Enforcement goes live. Safe because PR1 seeded behavior-neutral defaults. | PR1 (defaults must exist first) |
| **PR3** | Area C: `get_payment_accounts()` RPC → rewire payment flows → restrict `transactions` + `accounts` SELECT | Financial data no longer world-readable. | PR #4 (merged, unblocks `transactions`); internally ordered per §7 |

This slicing maps 1:1 to the three work areas and encodes both §7 orderings as PR boundaries: PR1's seed precedes PR2's enforcement; PR3 is internally ordered (RPC+rewire before restriction). PR3 is independent of PR1/PR2 and could ship in parallel, but touches financial security — recommend it lands last or under `security-auditor` review (touches `**/payments/**`-equivalent flows + RLS → 4R / judgment-day review warranted).

## 9. Testing strategy (Strict TDD — runner `pnpm test`, package manager pnpm)

**Unit-testable (Vitest, red→green, no DB):**
- **Nav-visibility resolver.** Extract the path→`module.*` mapping + "show this item?" decision into a pure function (reused by SideBar and BottomNav) and unit-test it: admin sees all; configurable item hidden when `can()` false; sensitive item hidden for non-admin regardless of any override. This is the highest-value new unit and mirrors Fase 1's `resolvePermission` test pattern.
- **Module-key derivation / registry integrity.** Assert `PERMISSION_DEFS` contains exactly the 10 `module.*` keys with `level: "module"` and `group: "Módulos"`, `PERMISSION_GROUPS` now includes `"Módulos"`, and `PermissionKey` covers every module key (compile-time + a runtime completeness test).

**Integration-only (verify via MCP `execute_sql` scenarios, recorded as manual checks — no Vitest DB harness):**
- **RLS hardening.** As a non-admin: `SELECT` on `transactions` → **denied**; `SELECT` on `accounts` → **denied**; `get_payment_accounts()` → **returns `{id,type,name}` for the payment accounts** (no balance column). As admin: both SELECTs still work.
- **`has_permission('module.x', user)`** returns the seeded defaults per role, force-OFF override denies, admin → true (reuses Fase 1's §8 scenario harness with the new keys).
- **Middleware redirects.** Non-admin GET `/finanzas|/estadisticas|/auditoria|/users` → redirect to `/`; admin → 200. Manual/e2e check (middleware has no unit harness).

## 10. Open questions / risks carried to spec/design

- **Nav path→key map location.** Recommend a single shared `module-nav.ts` (pure, in `utils/` or the permissions feature) imported by SideBar, BottomNav, and its unit test — avoids duplicating the map in two nav files. (Design decision.)
- **`usePermissions().isLoading` flash.** Page guards must not redirect while `usePermissions()` is loading (mirror the `!isLoading && !can(...)` pattern) to avoid bouncing a permitted user during hydration. Low risk, mechanical, but must be explicit in tasks.
- **`get_payment_accounts()` shape confirmed** as `{id, type, name}` (name needed by `AccountSelector`; balance deliberately excluded).
- **`database.ts` regen ordering** (Area C): regenerate types after the RPC migration or the RPC return type is missing client-side — surfaced early at compile.
- **PR3 security surface.** Touches RLS + payment flows; recommend `security-auditor` + judgment-day review before merge (Blu security model: `record_transaction` sole write path, SECURITY DEFINER + REVOKE anon, no world-readable financial data).
