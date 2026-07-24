# Design: permissions-module-access — Phase 2 (Module Access)

> Artifact store: hybrid (this file + engram `sdd/permissions-module-access/design`).
> Date: 2026-07-23. Reads: proposal.md (authoritative) + engram id 159; exploration.md; Fase 1 `permissions-full-control/design.md` (REUSE `has_permission`/`resolvePermission`/`user_permissions` UNCHANGED).
> Scope: HOW at architectural level. No task steps, no code changes here.

## 1. Architecture approach

Extend the Fase 1 stack **in place**, adding a `level` discriminator to the registry and a `module.*` key family that flows through the already-shipped ladder (`PERMISSION_DEFS` → `has_permission`/`resolvePermission` → `usePermissions().can()`). Fase 1 primitives (`user_permissions` table, `has_permission` body, `resolvePermission`, tri-state, 4-branch order) are **frozen** — this change only adds data (rows/keys) and new consumers. Enforcement is layered: pure nav resolver (unit-tested), page `can()` guards, and a single server-side middleware role check for the 4 permanently-admin paths. Area C hardens financial RLS behind a narrow SECURITY DEFINER RPC. Layering `types→services→hooks→components→pages` holds; middleware is the one server edge; no `createClient` in presentational components.

## 2. Architecture decisions (ADR-style)

### ADR-1 — Registry: `level` discriminator + `"Módulos"` group, keys derive automatically
**Choice**: Add `level: "module" | "action" | "field"` to `PermissionDef`; add `"Módulos"` to the hardcoded `PermissionGroup` union (line 7); set `level:"action"` on the existing 7 defs; append 10 `module.*` defs `group:"Módulos" level:"module"`. `PermissionKey` (line 64) and `PERMISSION_GROUPS` (line 68) are **derived** and pick up both changes with no edit.
**Alternatives**: separate `MODULE_DEFS` array / a `moduleKeys` table. **Rejected** — splits the single source of truth, duplicates the dashboard's group loop, breaks the `PermissionKey` union that `can()` and SQL parity depend on.
**Rationale**: one registry keeps `resolvePermission`/`has_permission` untouched (a `module.*` key is just another key); `level` is the seam Fase 3 (`"field"`) plugs into with zero registry churn.

```ts
export type PermissionGroup = "Ventas" | "Inventario" | "Compras" | "Módulos";
export interface PermissionDef { key: string; label: string; description: string; group: PermissionGroup; level: "module" | "action" | "field"; }
// existing 7 defs: add `level: "action"`. Then append (all group:"Módulos", level:"module"):
// module.categories "Ver Categorías" · module.products "Ver Productos" · module.ingredients "Ver Ingredientes"
// module.recipes "Ver Recetas" · module.sales "Ver Ventas" · module.pedidos "Ver Pedidos"
// module.compras "Ver Compras" · module.inventario "Ver Inventario" · module.horario "Ver Horario" · module.actividades "Ver Actividades"
```
Descriptions follow the pattern "Permite abrir el módulo de X." A registry-integrity unit test asserts exactly 10 `module.*` keys, all `level:"module" group:"Módulos"`, and `PERMISSION_GROUPS` includes `"Módulos"`.

### ADR-2 — Seed BEFORE enforcement, behavior-neutral, `ON CONFLICT DO NOTHING`
**Choice**: One timestamped migration seeds `role_permissions` for cocinero+barista reproducing today's access: `enabled=true` for the 8 all-role modules, `enabled=false` for `ingredients`/`recipes`. Admin gets no rows (branch-1 invariant). Idempotent via `ON CONFLICT (role,permission) DO NOTHING`.
**Alternatives**: seed inside enforcement PR. **Rejected** — if enforcement lands without seeded defaults, branch-4 default-deny instantly strips non-admins of sales/compras/inventario.
**Rationale**: PR1 (registry+seed+dashboard) is behavior-neutral; PR2 enforcement is safe only because defaults already exist.

```sql
INSERT INTO public.role_permissions (role, permission, enabled) VALUES
  ('cocinero','module.categories',true),('cocinero','module.products',true),('cocinero','module.sales',true),
  ('cocinero','module.pedidos',true),('cocinero','module.compras',true),('cocinero','module.inventario',true),
  ('cocinero','module.horario',true),('cocinero','module.actividades',true),
  ('cocinero','module.ingredients',false),('cocinero','module.recipes',false)
  -- repeat identical 10 rows for 'barista'
ON CONFLICT (role, permission) DO NOTHING;
```
Create via `execute_sql` while iterating, commit with `supabase db pull` per the supabase skill.

### ADR-3 — Single pure `moduleNav` resolver shared by both nav bars
**Choice**: New pure module `src/features/usuarios/permissions/moduleNav.ts` exporting the path→`module.*` map and `isNavItemVisible(item, ctx)`. No hooks, no React — testable like `resolvePermission`. Both `SideBar` and `BottomNav` import it; the current `!item.adminOnly || isAdmin` filter is replaced by a single call.
**Alternatives**: duplicate logic inline in each nav file. **Rejected** — two copies of a security filter drift; not unit-testable without rendering.
**Rationale**: highest-value new unit; mirrors Fase 1's pure-resolver pattern; keeps the 4 sensitive items non-delegatable in one place.

```ts
const NAV_MODULE_KEY: Record<string, PermissionKey> = {
  "/categories":"module.categories","/products":"module.products","/ingredients":"module.ingredients",
  "/recipes":"module.recipes","/sales":"module.sales","/pedidos":"module.pedidos","/compras":"module.compras",
  "/inventario":"module.inventario","/horario":"module.horario","/actividades":"module.actividades",
};
// Sensitive paths have NO entry here and keep item.adminOnly.
export function isNavItemVisible(
  item: { nav: string; adminOnly?: boolean },
  ctx: { isAdmin: boolean; can: (k: PermissionKey) => boolean },
): boolean {
  if (item.adminOnly) return ctx.isAdmin;      // the 4 sensitive modules — never delegatable
  const key = NAV_MODULE_KEY[item.nav];
  return key ? ctx.can(key) : true;            // unmapped (non-module) items stay visible
}
```
BottomNav uses `item.href` (adapt the accessor) and applies the same function after its existing "not already in tabs" filter. `can()` returns true for admins (branch-1), so admins see everything. Nav components call `usePermissions()` alongside `useAuth()`.

### ADR-4 — Page guard mirrors the finanzas pattern, `can()` replaces `isAdmin`
**Choice**: Each of the ~10 configurable pages adds, at the top of the component (mirroring `finanzas/page.tsx` lines 52-56):
```ts
const { can, isLoading } = usePermissions();
if (!isLoading && !can("module.<name>")) redirect("/");
```
`ingredients`/`recipes` **swap** their current `isAdmin` redirect for `can("module.ingredients"|"module.recipes")` (default-OFF seed preserves admin-only day one). The `!isLoading` guard prevents redirecting a permitted user mid-hydration.
**Alternatives**: a shared `useModuleGuard(key)` hook. **Rejected for now** — 3-line inline guard matches the existing per-page convention; a hook is a Fase-3-friendly refactor, not required. **Rationale**: consistency with shipped pages; minimal LOC per page.

Page→key: categories→`module.categories`, products→`module.products`, ingredients→`module.ingredients`, recipes→`module.recipes`, sales→`module.sales`, pedidos→`module.pedidos`, compras→`module.compras`, inventario→`module.inventario`, horario→`module.horario`, actividades→`module.actividades`. The 4 sensitive pages keep their `isAdmin` guard unchanged.

### ADR-5 — Middleware Option C: one role query, only on the 4 sensitive prefixes
**Choice**: In `src/utils/supabase/middleware.ts`, after `auth.getUser()`, add a guarded block: if `user` and `pathname` starts with one of `["/finanzas","/estadisticas","/auditoria","/users"]`, run one `supabase.from("user_profiles").select("role").eq("id", user.id).single()`; if `role !== "admin"` (or no profile), `return NextResponse.redirect(new URL("/", request.url))`. The prefix check is a cheap sync guard **before** the await (no query on any other path). The existing auth redirects and the `supabaseResponse` cookie object are preserved — only the sensitive-4 non-admin case short-circuits to a redirect.
**Alternatives**: (A) call `has_permission` RPC per request for all modules — **rejected**, per-request latency on every navigation, and configurable modules already covered by page `can()`; (B) no middleware, rely on page redirect — **rejected**, `/estadisticas` had no guard (the URL-bypass this closes at the server edge).
**Rationale**: closes the URL bypass server-side for exactly the 4 never-delegatable paths at the cost of one indexed PK lookup, and only on those paths. Edge cases: `user` null is already handled by the existing auth redirect above; `.single()` error / null profile → treat as non-admin → redirect to `/`.

```ts
const SENSITIVE_PREFIXES = ["/finanzas", "/estadisticas", "/auditoria", "/users"];
// after getUser(), user present:
if (SENSITIVE_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p))) {
  const { data: profile } = await supabase
    .from("user_profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.redirect(new URL("/", request.url));
}
return supabaseResponse; // preserves refreshed cookies
```
`src/middleware.ts` (config/matcher) is unchanged — the 4 paths already pass the matcher.

### ADR-6 — Dashboard groups by `level`, presentational-only change
**Choice**: `RoleMatrix` and `UserOverridePanel` render an "Acceso a módulos" section for `level:"module"` defs, separate from action defs. Minimal change: keep the existing `PERMISSION_GROUPS.map(group => defs.filter(d => d.group === group))` loop — because `module.*` defs carry `group:"Módulos"`, they already fall into their own group block. The only addition is an optional level-driven section heading/ordering (render `"Módulos"` group under an "Acceso a módulos" label). No new components.
**Rationale**: the group loop already partitions by group; `"Módulos"` being a group means module toggles surface automatically. `level` drives copy/ordering, not structure — keeps both files well under 300 LOC.

### ADR-7 — Area C: `get_payment_accounts()` RPC + new `usePaymentAccounts()` hook, then restrict SELECT
**Choice**: New `SECURITY DEFINER` RPC returns `{id,type,name}` (NO balance). Add a **new** `usePaymentAccounts()` hook (not modify `useAccounts()`), because admin finanzas pages and forms (`finanzas/page`, `TransferForm`, `ExpenseForm`, `ExtraIncomeForm`, `InitialBalanceForm`) still need `useAccounts()` balances via the direct `accounts` SELECT (which stays admin-only after RLS). Non-admin payment flows switch to `usePaymentAccounts()`: `PaymentModal`, `SaleForm`, `PurchaseForm` (via `usePurchaseFormInit`), and `AccountSelector` (receives `{id,type,name}` accounts as props — no shape change). **Then** restrict `transactions` and `accounts` SELECT to admin-only, mirroring the `audit_logs` admin_read policy.
**Alternatives**: overload `useAccounts()` to internally choose RPC vs SELECT by role. **Rejected** — muddies one hook with two data shapes/paths and two SWR keys; admin balance pages would silently lose the balance column.
**Rationale**: clean separation — admin reads balances directly (RLS allows admin), non-admins get the minimal ID/name/type list via RPC. Ordering (§4) is load-bearing: RPC+rewire ship and verify BEFORE the SELECT restriction, or non-admin payment registration breaks.

```sql
CREATE OR REPLACE FUNCTION public.get_payment_accounts()
RETURNS TABLE (id bigint, type text, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT a.id, a.type, a.name FROM public.accounts a ORDER BY a.id; $$;
REVOKE EXECUTE ON FUNCTION public.get_payment_accounts() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_payment_accounts() TO authenticated;

-- Restrict SELECT (drop qual:true policies, add admin-EXISTS, mirror audit_logs admin_read):
DROP POLICY IF EXISTS <transactions_select_policy> ON public.transactions;
CREATE POLICY transactions_admin_read ON public.transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role='admin'));
DROP POLICY IF EXISTS <accounts_select_policy> ON public.accounts;
CREATE POLICY accounts_admin_read ON public.accounts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role='admin'));
```
`bigint` return matches `accounts.id` (confirm the actual column type during apply; the RPC signature must match `database.ts`). Regenerate `database.ts` **after** the RPC migration so `get_payment_accounts` return type exists client-side before the hook compiles. `recordTransaction` (SECURITY DEFINER write) is unaffected by SELECT restriction.

## 3. Data flow

```
Registry (permissions.ts, +level +Módulos +10 keys)
   │
   ├──→ SQL has_permission (UNCHANGED) ──→ RLS write-gating (unchanged)
   └──→ resolvePermission (UNCHANGED) ──→ usePermissions().can()
                                              ├─→ isNavItemVisible() → SideBar / BottomNav
                                              └─→ page guard: !isLoading && !can("module.x") → redirect("/")

Middleware (server edge): getUser() → [path ∈ 4 sensitive] → user_profiles.role → non-admin ⇒ redirect("/")

Area C: get_payment_accounts() RPC ──→ usePaymentAccounts() ──→ PaymentModal/SaleForm/PurchaseForm/AccountSelector
        accounts/transactions SELECT ── admin-only ──→ useAccounts() (finanzas balances only)
```

## 4. Sequencing → PRs

- **PR1 (Area A, behavior-neutral)**: registry (`level`+`"Módulos"`+10 keys) → seed migration (deploy first) → dashboard `level` grouping → registry-integrity unit test. Verify seeded defaults reproduce today's access.
- **PR2 (Area B, enforcement)**: `moduleNav.ts` + unit test → SideBar/BottomNav use resolver → ~10 page guards (ingredients/recipes swap `isAdmin`→`can`) → middleware Option C. Depends on PR1's seed.
- **PR3 (Area C, financial RLS)**: RPC migration → regen `database.ts` → `usePaymentAccounts()` → rewire payment flows → verify non-admin can register a payment → restrict `transactions`+`accounts` SELECT. Internally ordered (§7 of proposal); recommend last / under security-auditor + judgment-day (touches RLS + payment flows).

## 5. Testing strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (Vitest, `pnpm test`) | `isNavItemVisible` (admin sees all; configurable hidden when `can` false; sensitive hidden for non-admin regardless) | pure fn, red→green |
| Unit | Registry integrity (10 `module.*` keys, `level`/`group`, `PERMISSION_GROUPS` has `"Módulos"`) | assertion over `PERMISSION_DEFS` |
| Integration (MCP `execute_sql`, manual) | RLS: non-admin SELECT `transactions`/`accounts` denied; `get_payment_accounts()` returns `{id,type,name}` no balance; admin unaffected. `has_permission('module.x')` per-role defaults, force-OFF denies, admin true | recorded manual checks |
| E2E/manual | Middleware: non-admin GET `/finanzas|/estadisticas|/auditoria|/users` → redirect; admin → 200 | manual |

## 6. Size / risk flags

- `moduleNav.ts` pure util (<50 LOC) ✓. `usePaymentAccounts()` hook (~30 LOC) ✓. Page guards add ~3 LOC each — no page crosses 200. `RoleMatrix`/`UserOverridePanel` stay <300 (presentational-only change) ✓. Middleware grows ~8 LOC — still small.
- **No hard-stop.** All files within limits; Fase 1 primitives untouched.
- **Risks**: (1) `database.ts` regen ordering in PR3 (gate hook compile — surfaced early). (2) `accounts.id` type in RPC signature must match generated types. (3) middleware `.single()` on missing profile → must default to redirect (non-admin). (4) `isLoading` flash on page guards — mandatory `!isLoading` gate.

## 7. Open questions — RESOLVED (orchestrator, verified against live DB 2026-07-23)
- [x] `accounts.id` and `transactions.id` are both **`bigint`** → the RPC `RETURNS TABLE (id bigint, type text, name text)` signature is CORRECT (do NOT use `integer`).
- [x] SELECT policies to DROP in Area C: **`authenticated_read_accounts`** (on accounts) and **`authenticated_read_transactions`** (on transactions). Replace with the admin-EXISTS policies as designed.
- [x] `usePermissions()` exposes `can` + `isLoading` (verified in the shipped Fase 1 hook).
