# Exploration: permissions-module-access (Fase 2)

> Artifact store: hybrid. Engram topic key `sdd/permissions-module-access/explore` (id 158).
> Date: 2026-07-23. Reads: Fase 1 `openspec/changes/permissions-full-control/{exploration,design}.md`.

## Goal
Add `module.*` permission keys for configurable module/nav visibility, enforce at UI + server-side middleware, and harden financial RLS where safe. Reuses the Fase 1 foundation (`has_permission`, `user_permissions`, `PERMISSION_DEFS`, `can()`).

## Confirmed decisions
- Configurable modules (get a `module.*` key): categories, products, ingredients, recipes, sales, pedidos, compras, inventario, horario, actividades.
- Hardcoded admin-only forever (no key): finanzas, estadisticas, auditoria, users.
- Enforcement = UI (nav + page guards) + server-side middleware.
- Harden `transactions`/`accounts` SELECT RLS (currently `qual: true` for authenticated).

## 1. CRITICAL pre-existing gap — VERIFIED
`src/app/estadisticas/page.tsx` does NOT import `useAuth` and has no `isAdmin`/`redirect` guard (unlike `finanzas/page.tsx`). Any authenticated non-admin can open `/estadisticas` directly and see financial statistics (`transactions` via `useSalesStats` → `fetchExpenses`). SideBar/BottomNav hide it via `adminOnly` (UI-only, URL bypass). Middleware is auth-only. **Fix: add the same `useAuth()` + `if (!authLoading && !isAdmin) redirect("/")` block as finanzas. This is also a hard prerequisite for hardening `transactions` RLS.**

## 2. RLS blast radius — `accounts` (VERIFIED: useAccounts used by non-admin payment forms)
| Read site | Non-admin reachable? | Notes |
|---|---|---|
| `useAccounts()` (`src/hooks/useAccounts.ts`) | YES | id+type+balance for all 4 accounts |
| `PaymentModal`, `SaleForm` (`/sales`, all roles) | YES | need account IDs for `record_transaction` |
| `PurchaseForm` + `AccountSelector` + `usePurchaseFormInit` (`/compras`) | YES | need cajaAccount.id |
| `finanzas/page.tsx` + finanzas forms (Expense/ExtraIncome/Transfer/InitialBalance) | NO (admin-gated) | balance + ops |
| `dailySummaryService.ts` | NO (finanzas only) | summaries |

Hardening `accounts` SELECT to admin-only **breaks PaymentModal/SaleForm/PurchaseForm for non-admins**. Mitigation: narrow `SECURITY DEFINER` RPC `get_payment_accounts()` returning `{id, type, name}` (NO balance); non-admin flows call it, admin pages keep direct SELECT, then restrict `accounts` SELECT to admin.

## 3. RLS blast radius — `transactions`
| Read site | Non-admin reachable? |
|---|---|
| `useTransactions()` / `finanzas/page.tsx` | NO (admin-gated) |
| `useSalesStats.fetchExpenses` via `estadisticas/page.tsx` | YES — because estadisticas has no guard (gap #1) |
| `dailySummaryService.ts` | NO |
Hardening `transactions` SELECT to admin-only is safe **only after** the estadisticas guard is in place. `recordTransaction` (write) is SECURITY DEFINER — unaffected.

## 4. Middleware approach — recommend Option C
Current `src/middleware.ts` → `updateSession` (`src/utils/supabase/middleware.ts`): auth-only, nodejs runtime, zero role awareness.
- **Option C (recommended):** middleware does a server-side ROLE check for the 4 permanently-admin paths (`/finanzas`, `/estadisticas`, `/auditoria`, `/users`) → redirect non-admins; configurable module paths use page-level `can("module.*")` guards (existing hook, handles per-user overrides). One extra `user_profiles.role` query only for the 4 protected paths. Low latency, closes the URL bypass for the sensitive pages.
- Option A (has_permission RPC per path): full server enforcement, high per-request latency. Option B (role-only for all): no per-user overrides.

## 5. Nav + page-guard inventory
Configurable (`can("module.X")`): categories, products, ingredients(OFF default), recipes(OFF default), sales, pedidos, compras, inventario, horario, actividades. Hardcoded admin-only (keep `adminOnly` + middleware): finanzas, estadisticas, auditoria, users. SideBar/BottomNav filter changes from `!item.adminOnly || isAdmin` to a resolver that checks `can()` for configurable items and keeps `adminOnly` for the 4 sensitive.

## 6. Registry model
Add group `"Módulos"` and a `level: "module" | "action" | "field"` discriminator to `PermissionDef`. NOTE: `PermissionGroup` is a HARDCODED union (`"Ventas" | "Inventario" | "Compras"`) — must manually add `"Módulos"`; `PERMISSION_GROUPS` (derived) picks it up automatically. 10 new `module.*` keys.

## 7. Seed defaults (behavior-neutral rollout — seed BEFORE enforcement ships)
ON for cocinero+barista: categories, products, sales, pedidos, compras, inventario, horario, actividades (currently all-role). OFF for both: ingredients, recipes (currently admin-only).

## 8. Risks
- CRITICAL (pre-existing, verified): estadisticas has no admin guard → add redirect.
- HIGH: accounts hardening breaks non-admin payment flow → `get_payment_accounts()` RPC prerequisite.
- MEDIUM: transactions hardening requires estadisticas guard first (sequencing).
- MEDIUM: seed migration must precede enforcement code.
- MEDIUM: `PermissionGroup` union hardcoded — add `"Módulos"`.
- LOW: dashboard `RoleMatrix` must render the "Módulos" group distinctly (module vs action).

## 9. Open questions for proposal
1. estadisticas guard: immediate hotfix PR or first commit of Fase 2 PR1?
2. `get_payment_accounts()` shape: `{id,type,name}` (recommended) vs `{id,type}`.
3. Confirm ingredients/recipes become configurable (default OFF) — yes per scope.
4. `level` discriminator: add in Fase 2 — yes (dashboard needs it).
5. Enforcement of configurable modules: page-level `can()` sufficient (Option C) vs middleware for all.
