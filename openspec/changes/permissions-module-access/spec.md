# Spec: permissions-module-access (Fase 2)

> Artifact store: hybrid (this file + engram `sdd/permissions-module-access/spec`).
> Date: 2026-07-23. Phase: spec. Reads: proposal.md + exploration.md.
> Scope: WHAT must be true after this change — implementation-agnostic.

---

## REQ-1: Module permission registry

### 1.1 — `PermissionGroup` includes "Módulos"

The `PermissionGroup` type in `src/types/permissions.ts` MUST include the literal `"Módulos"` in its hardcoded union. `PERMISSION_GROUPS` (derived from it) MUST include `"Módulos"` without any manual addition.

**Acceptance scenarios**

**S1.1-a — Type completeness**
- Given: the compiled TypeScript type for `PermissionGroup`
- When: a developer assigns `"Módulos"` to a `PermissionGroup` variable
- Then: TypeScript accepts it without error

**S1.1-b — Runtime completeness**
- Given: the exported `PERMISSION_GROUPS` array at runtime
- When: the array is inspected
- Then: it contains the string `"Módulos"`

---

### 1.2 — `PermissionDef` has a `level` discriminator

Every entry in `PERMISSION_DEFS` MUST have a `level` field typed as `"module" | "action" | "field"`.

**Acceptance scenarios**

**S1.2-a — Existing action keys carry `level: "action"`**
- Given: all 7 pre-existing permission keys in `PERMISSION_DEFS` (from Fase 1)
- When: each entry's `level` field is read
- Then: all 7 entries have `level === "action"`

**S1.2-b — New module keys carry `level: "module"`**
- Given: the 10 new `module.*` entries in `PERMISSION_DEFS`
- When: each entry's `level` field is read
- Then: all 10 entries have `level === "module"`

---

### 1.3 — Exactly 10 `module.*` keys exist

`PERMISSION_DEFS` MUST contain exactly these 10 keys, in any order, all with `group: "Módulos"` and `level: "module"`:

| Key | Module |
|-----|--------|
| `module.categories` | Categorías |
| `module.products` | Productos |
| `module.ingredients` | Ingredientes |
| `module.recipes` | Recetas |
| `module.sales` | Ventas |
| `module.pedidos` | Pedidos |
| `module.compras` | Compras |
| `module.inventario` | Inventario |
| `module.horario` | Horario |
| `module.actividades` | Actividades |

**Acceptance scenarios**

**S1.3-a — Key presence**
- Given: `PERMISSION_DEFS`
- When: the set of all keys whose `level === "module"` is computed
- Then: the set equals exactly the 10 keys listed above — no more, no fewer

**S1.3-b — Group assignment**
- Given: the 10 `module.*` entries
- When: each entry's `group` field is read
- Then: every entry has `group === "Módulos"`

**S1.3-c — `PermissionKey` coverage**
- Given: the derived `PermissionKey` union type
- When: each of the 10 `module.*` strings is used as a `PermissionKey`
- Then: TypeScript accepts all 10 without error, and no `module.*` key is accepted that is not in the list above

---

## REQ-2: Behavior-neutral seed

### 2.1 — Role defaults seeded before any enforcement ships

A database migration MUST insert `role_permissions` rows for `cocinero` and `barista` covering all 10 `module.*` keys. `admin` MUST have no `role_permissions` rows for any `module.*` key (branch-1 invariant: admin always has everything, no DB row required).

| Key | cocinero | barista |
|-----|----------|---------|
| `module.categories` | `enabled=true` | `enabled=true` |
| `module.products` | `enabled=true` | `enabled=true` |
| `module.ingredients` | `enabled=false` | `enabled=false` |
| `module.recipes` | `enabled=false` | `enabled=false` |
| `module.sales` | `enabled=true` | `enabled=true` |
| `module.pedidos` | `enabled=true` | `enabled=true` |
| `module.compras` | `enabled=true` | `enabled=true` |
| `module.inventario` | `enabled=true` | `enabled=true` |
| `module.horario` | `enabled=true` | `enabled=true` |
| `module.actividades` | `enabled=true` | `enabled=true` |

**Acceptance scenarios**

**S2.1-a — Cocinero seeded ON**
- Given: the seed migration has been applied
- When: `SELECT key, enabled FROM role_permissions WHERE role = 'cocinero' AND key LIKE 'module.%'` is executed
- Then: 10 rows are returned; 8 have `enabled=true` (all except ingredients and recipes); 2 have `enabled=false` (ingredients, recipes)

**S2.1-b — Barista seeded identically**
- Given: the seed migration has been applied
- When: `SELECT key, enabled FROM role_permissions WHERE role = 'barista' AND key LIKE 'module.%'` is executed
- Then: same 10 rows as S2.1-a with identical `enabled` values

**S2.1-c — Admin has no module rows**
- Given: the seed migration has been applied
- When: `SELECT COUNT(*) FROM role_permissions WHERE role = 'admin' AND key LIKE 'module.%'` is executed
- Then: count is 0

---

### 2.2 — Rollout is behavior-neutral for non-admins

When enforcement ships (REQ-3, REQ-4), no non-admin user gains or loses access to a module they could access before this change, assuming no per-user override rows exist.

**Acceptance scenarios**

**S2.2-a — Cocinero/barista retain access to previously all-role modules**
- Given: the seed migration and enforcement code are both active; no per-user overrides exist for a cocinero user
- When: `has_permission('module.sales', cocinero_user_id)` is called (and equivalently for categories, products, pedidos, compras, inventario, horario, actividades)
- Then: returns `true`

**S2.2-b — Cocinero/barista remain blocked from admin-only modules**
- Given: the seed migration and enforcement code are both active; no per-user overrides
- When: `has_permission('module.ingredients', cocinero_user_id)` is called (and equivalently for recipes)
- Then: returns `false`

**S2.2-c — Admin is unaffected**
- Given: enforcement is active
- When: `has_permission('module.ingredients', admin_user_id)` is called for any module key
- Then: returns `true` (branch-1 short-circuit, no DB row required)

---

## REQ-3: Nav visibility

### 3.1 — Hardcoded sensitive items remain admin-only

The four nav items for `/finanzas`, `/estadisticas`, `/auditoria`, `/users` MUST be shown ONLY to admin users. No configurable permission key can grant these items to non-admins. This is enforced by a hardcoded `adminOnly` flag, not by `can()`.

**Acceptance scenarios**

**S3.1-a — Sensitive items hidden for non-admin**
- Given: a cocinero or barista user is authenticated
- When: the nav (SideBar on desktop, BottomNav/BottomSheet on mobile) renders
- Then: no nav item for `/finanzas`, `/estadisticas`, `/auditoria`, or `/users` is present in the DOM

**S3.1-b — Sensitive items visible for admin**
- Given: an admin user is authenticated
- When: the nav renders
- Then: all four sensitive nav items are present

---

### 3.2 — Configurable items shown when `can("module.x")` is true

Each of the 10 configurable nav items MUST be visible if and only if `can("module.<name>")` returns `true` for the current user. Admin always passes (branch-1). Per-user force-OFF hides the item even when the role default is ON.

**Acceptance scenarios**

**S3.2-a — Item visible when permission is ON**
- Given: the role default for `module.sales` is `enabled=true` for barista; no per-user override exists
- When: a barista user's nav renders
- Then: the `/sales` nav item is present

**S3.2-b — Item hidden when role default is OFF and no override**
- Given: the role default for `module.ingredients` is `enabled=false` for cocinero; no per-user override exists
- When: a cocinero user's nav renders
- Then: the `/ingredients` nav item is absent

**S3.2-c — Force-OFF override hides an otherwise ON item**
- Given: the role default for `module.compras` is `enabled=true` for barista; a per-user `user_permissions` row exists for this barista with `key='module.compras'`, `enabled=false`
- When: that barista user's nav renders
- Then: the `/compras` nav item is absent

**S3.2-d — Admin sees all configurable items**
- Given: an admin user is authenticated; no per-user overrides exist
- When: the nav renders
- Then: all 10 configurable nav items are present (in addition to the 4 sensitive items)

---

### 3.3 — No nav flash during permissions loading

Nav items MUST NOT be shown and then hidden (or hidden and then shown) as `usePermissions()` resolves. While permissions are loading, nav renders consistently (either skeleton or stable items).

**Acceptance scenarios**

**S3.3-a — Stable render during load**
- Given: `usePermissions().isLoading` is `true`
- When: the nav component renders
- Then: no configurable item that requires `can()` switches from visible to hidden (or vice versa) between the loading and loaded states for the same user session

---

## REQ-4: Page guards

### 4.1 — Each configurable page redirects when `can("module.x")` is false

Every one of the 10 configurable pages MUST redirect to `/` when `!isLoading && !can("module.<name>")`. This mirrors the existing finanzas pattern. The redirect MUST NOT fire while `usePermissions().isLoading` is `true`.

Configurable pages and their required keys:

| Page path | Required key |
|-----------|-------------|
| `/categories` | `module.categories` |
| `/products` | `module.products` |
| `/ingredients` | `module.ingredients` |
| `/recipes` | `module.recipes` |
| `/sales` | `module.sales` |
| `/pedidos` | `module.pedidos` |
| `/compras` | `module.compras` |
| `/inventario` | `module.inventario` |
| `/horario` | `module.horario` |
| `/actividades` | `module.actividades` |

**Acceptance scenarios**

**S4.1-a — Permitted user sees the page**
- Given: a cocinero user has `module.sales` permission (role default ON, no override)
- When: the user navigates to `/sales`
- Then: the page renders normally without redirect

**S4.1-b — Denied user is redirected**
- Given: a cocinero user has `module.ingredients` permission denied (role default OFF, no override)
- When: the user navigates to `/ingredients`
- Then: the page redirects to `/`

**S4.1-c — Force-OFF override redirects**
- Given: a barista user has a per-user `user_permissions` row with `key='module.compras'`, `enabled=false`; the role default is ON
- When: the user navigates to `/compras`
- Then: the page redirects to `/`

**S4.1-d — No redirect during loading**
- Given: any user navigates to a configurable page; `usePermissions().isLoading` is `true`
- When: the guard logic evaluates
- Then: no redirect occurs until `isLoading` becomes `false`

**S4.1-e — Admin is never redirected**
- Given: an admin user navigates to `/ingredients` (default OFF for non-admins)
- When: the guard evaluates
- Then: the page renders; no redirect

---

### 4.2 — `ingredients` and `recipes` default-OFF preserves admin-only behavior on day one

Because the seed sets `module.ingredients` and `module.recipes` to `enabled=false` for both cocinero and barista, swapping the old `isAdmin` redirect for a `can("module.ingredients")` guard MUST produce the same day-one behavior: only admins can access those pages.

**Acceptance scenarios**

**S4.2-a — Non-admin blocked on day one**
- Given: no per-user override exists for `module.ingredients`; the seed migration is applied
- When: a barista navigates to `/ingredients`
- Then: the page redirects to `/` (role default OFF → `can()` false)

**S4.2-b — Admin can always access**
- Given: the seed migration is applied
- When: an admin navigates to `/ingredients`
- Then: the page renders (admin branch-1 bypass)

---

## REQ-5: Middleware — server-side guard for the 4 sensitive paths

### 5.1 — Non-admin GET to sensitive paths is redirected server-side

The middleware MUST redirect any authenticated non-admin user who requests `/finanzas`, `/estadisticas`, `/auditoria`, or `/users` (and any sub-paths) to `/` before the page renders. This is a server-side redirect — the page component does not render at all.

**Acceptance scenarios**

**S5.1-a — Non-admin redirected from /finanzas**
- Given: a cocinero user with a valid session cookie makes a GET request to `/finanzas`
- When: the middleware processes the request
- Then: the response is a redirect to `/`; the finanzas page component does not execute

**S5.1-b — Non-admin redirected from /estadisticas**
- Given: a barista user with a valid session makes a GET request to `/estadisticas`
- When: the middleware processes the request
- Then: the response is a redirect to `/`

**S5.1-c — Non-admin redirected from /auditoria**
- Given: a cocinero user makes a GET request to `/auditoria`
- When: the middleware processes the request
- Then: the response is a redirect to `/`

**S5.1-d — Non-admin redirected from /users**
- Given: a barista user makes a GET request to `/users`
- When: the middleware processes the request
- Then: the response is a redirect to `/`

**S5.1-e — Admin passes through**
- Given: an admin user with a valid session makes a GET request to any of the 4 sensitive paths
- When: the middleware processes the request
- Then: the request proceeds to the page; no redirect

---

### 5.2 — Unauthenticated requests still redirect to /login

The existing auth-only redirect behavior MUST be preserved. The new role check does not affect the auth check.

**Acceptance scenarios**

**S5.2-a — Unauthenticated request to any protected path redirects to /login**
- Given: a request with no valid session cookie targets `/finanzas`, `/sales`, or any app path
- When: the middleware processes the request
- Then: the response is a redirect to `/login` (unchanged from pre-change behavior)

---

### 5.3 — Configurable paths are not touched by middleware

The middleware MUST NOT perform any role or permission check for configurable module paths (`/categories`, `/products`, `/ingredients`, `/recipes`, `/sales`, `/pedidos`, `/compras`, `/inventario`, `/horario`, `/actividades`). Enforcement for these paths is exclusively page-level via `can()`.

**Acceptance scenarios**

**S5.3-a — Non-admin with denied module reaches page component**
- Given: a cocinero user has `module.ingredients` denied; the user makes a GET request to `/ingredients`
- When: the middleware processes the request
- Then: the middleware does NOT redirect; the page component executes; the page-level guard (REQ-4) handles the redirect

---

## REQ-6: RLS hardening — `transactions`

### 6.1 — Non-admin SELECT on `transactions` is denied

After this change, any authenticated non-admin user who executes a direct SELECT on the `transactions` table MUST receive an empty result set or an RLS denial error, not any transaction rows.

**Acceptance scenarios**

**S6.1-a — Non-admin SELECT denied**
- Given: a cocinero user's authenticated Supabase client
- When: `SELECT * FROM transactions LIMIT 1` is executed
- Then: zero rows are returned (RLS denies the read)

**S6.1-b — Admin SELECT allowed**
- Given: an admin user's authenticated Supabase client
- When: `SELECT * FROM transactions LIMIT 1` is executed
- Then: rows are returned (if any exist)

**S6.1-c — `recordTransaction` write RPC is unaffected**
- Given: a non-admin user triggers a sale payment (calls `record_transaction` RPC)
- When: the RPC executes
- Then: the transaction is created successfully (SECURITY DEFINER bypasses the SELECT policy; write path is unaffected)

---

## REQ-7: RLS hardening — `accounts` and `get_payment_accounts()`

### 7.1 — `get_payment_accounts()` RPC exists and returns only `{id, type, name}`

A new `SECURITY DEFINER` function `get_payment_accounts()` MUST exist in the database. It MUST return a set of rows with exactly three columns: `id`, `type`, `name`. It MUST NOT return `balance` or any other financial column. It MUST be executable by `authenticated`. Execution by `anon` MUST be denied (REVOKE from anon).

**Acceptance scenarios**

**S7.1-a — Authenticated user gets account identity columns**
- Given: a cocinero user's authenticated Supabase client
- When: `SELECT * FROM get_payment_accounts()` is executed
- Then: rows are returned with columns `id`, `type`, `name`; no `balance` column is present

**S7.1-b — Anon cannot call the RPC**
- Given: an unauthenticated Supabase client (anon key, no session)
- When: `SELECT * FROM get_payment_accounts()` is executed
- Then: execution is denied with a permission error

**S7.1-c — Admin can also call the RPC**
- Given: an admin user's authenticated client
- When: `SELECT * FROM get_payment_accounts()` is executed
- Then: the same rows are returned (RPC works for all authenticated roles)

---

### 7.2 — Non-admin payment flows use `get_payment_accounts()`

The non-admin payment flows (`PaymentModal`, `SaleForm`, `PurchaseForm`, `AccountSelector`) MUST obtain account identity data exclusively from `get_payment_accounts()` (or an equivalent hook backed by it), not from a direct `accounts` SELECT.

**Acceptance scenarios**

**S7.2-a — Non-admin can complete a payment after accounts SELECT is restricted**
- Given: the `accounts` SELECT policy is restricted to admin; the payment flows have been rewired to `get_payment_accounts()`
- When: a barista user opens `PaymentModal` and selects a payment method and account, then submits
- Then: the sale payment is registered successfully (account ID is available; `record_transaction` executes)

**S7.2-b — Purchase payment works for non-admin**
- Given: same restricted state
- When: a cocinero user completes a purchase in `PurchaseForm`
- Then: the purchase payment is registered successfully

---

### 7.3 — Non-admin direct SELECT on `accounts` is denied

After the `accounts` SELECT policy is restricted, any authenticated non-admin user who executes a direct SELECT on `accounts` MUST receive zero rows or a denial error.

**Acceptance scenarios**

**S7.3-a — Non-admin SELECT denied**
- Given: a barista user's authenticated Supabase client; the accounts SELECT restriction is applied
- When: `SELECT * FROM accounts LIMIT 1` is executed
- Then: zero rows are returned (RLS denies the read)

**S7.3-b — Admin SELECT allowed**
- Given: an admin user's authenticated client
- When: `SELECT * FROM accounts LIMIT 1` is executed
- Then: rows including the `balance` column are returned

**S7.3-c — Admin finanzas pages continue to work**
- Given: an admin user navigates to `/finanzas` (or any finanzas sub-page)
- When: account data is loaded (for balance display, transfers, etc.)
- Then: account data including balances renders correctly (admin still uses direct SELECT)

---

## REQ-8: Security invariants

### 8.1 — Admin always has all permissions

The branch-1 short-circuit in `resolvePermission` and `has_permission` MUST remain intact and unchanged. No `module.*` key, `role_permissions` row, or `user_permissions` row can deny an admin any permission.

**Acceptance scenarios**

**S8.1-a — Admin passes every module check**
- Given: an admin user with no overrides and no `role_permissions` rows for `module.*`
- When: `can("module.ingredients")` (or any module key) is evaluated
- Then: returns `true`

---

### 8.2 — The 4 sensitive paths are never configurable

No `module.*` key exists for `/finanzas`, `/estadisticas`, `/auditoria`, or `/users`. These paths MUST NOT appear in the permissions dashboard and cannot be granted to non-admins via any dashboard action.

**Acceptance scenarios**

**S8.2-a — No sensitive module key in the registry**
- Given: `PERMISSION_DEFS`
- When: the set of keys is inspected
- Then: `module.finanzas`, `module.estadisticas`, `module.auditoria`, and `module.users` are absent

**S8.2-b — Dashboard has no toggle for sensitive paths**
- Given: an admin opens the permissions dashboard
- When: the module permissions section is rendered
- Then: no toggle or row for finanzas, estadisticas, auditoria, or users appears

---

### 8.3 — Force-OFF per-user override denies access

A `user_permissions` row with `enabled=false` for any `module.*` key MUST deny the user that module regardless of the role default.

**Acceptance scenarios**

**S8.3-a — Force-OFF blocks page and nav item**
- Given: a cocinero's role default for `module.sales` is `enabled=true`; a `user_permissions` row with `key='module.sales'`, `enabled=false` exists for a specific cocinero
- When: that cocinero's nav renders AND the user navigates to `/sales`
- Then: the `/sales` nav item is absent AND the page redirects to `/`

---

## REQ-9: Rollout ordering — acceptance conditions

These are not implementation steps; they are post-condition assertions that must hold at the time each phase goes live.

### 9.1 — Seed migration is applied before enforcement code is active

**Acceptance condition:** at the moment nav filtering (`can("module.*")`) and page guards become active in production, `role_permissions` rows for all 10 `module.*` keys exist for `cocinero` and `barista` in the production database.

**Acceptance scenario**

**S9.1-a — No non-admin loses access on enforcement launch**
- Given: PR2 (enforcement) ships to production after PR1 (seed) has been applied and verified
- When: a cocinero user who previously had access to `/sales` opens the app for the first time after the deploy
- Then: the `/sales` nav item is present and the page loads without redirect (seed defaults ensure `can("module.sales")` is true)

---

### 9.2 — `get_payment_accounts()` and payment-flow rewiring are live before `accounts` SELECT is restricted

**Acceptance condition:** at the moment the `accounts` SELECT RLS policy changes to admin-only, the `get_payment_accounts()` RPC already exists AND all non-admin payment flows (`PaymentModal`, `SaleForm`, `PurchaseForm`, `AccountSelector`) are already reading from it in production.

**Acceptance scenario**

**S9.2-a — Non-admin payment succeeds immediately after accounts restriction**
- Given: `get_payment_accounts()` is deployed and payment flows are rewired (within PR3); the `accounts` SELECT restriction lands in the same migration or a subsequent one
- When: a barista user attempts to register a payment immediately after the PR3 deploy
- Then: the payment succeeds (the flow never relied on direct `accounts` SELECT at this point)

---

### 9.3 — `transactions` SELECT restriction applies only after estadisticas guard is merged

**Acceptance condition:** the `transactions` SELECT RLS policy changes to admin-only only when `/estadisticas` already has a server-side guard (hotfix PR #4, confirmed merged).

**Acceptance scenario**

**S9.3-a — `/estadisticas` does not break after transactions restriction**
- Given: PR #4 is merged (estadisticas guard active); the `transactions` SELECT is restricted to admin
- When: an admin navigates to `/estadisticas`
- Then: statistics render correctly
- When: a non-admin makes a GET request to `/estadisticas`
- Then: the middleware (REQ-5) redirects to `/` before any `transactions` query executes

---

## REQ-10: Dashboard — "Módulos" section in permission panel

### 10.1 — Module-level permissions render separately from action-level permissions

The permissions dashboard (`RoleMatrix` and `UserOverridePanel`) MUST render `level: "module"` entries under a distinct heading (e.g. "Acceso a módulos") separate from `level: "action"` entries. No new component is required — grouping by `level` within the existing components is sufficient.

**Acceptance scenarios**

**S10.1-a — RoleMatrix shows two sections**
- Given: an admin views the `RoleMatrix` in the permissions dashboard
- When: the panel renders
- Then: there is a visible section for module-level permissions (10 `module.*` toggles) and a separate section for action-level permissions (7 action toggles); they are not interleaved

**S10.1-b — UserOverridePanel shows module overrides separately**
- Given: an admin opens the override panel for a cocinero user
- When: the panel renders
- Then: module-level permissions (with their current tri-state: role default / force-ON / force-OFF) appear in a distinct section from action-level permissions

**S10.1-c — Toggle a module permission from the dashboard**
- Given: an admin sets `module.ingredients` to force-ON for a specific barista user in the override panel
- When: the change is saved
- Then: a `user_permissions` row with `key='module.ingredients'`, `enabled=true` is upserted for that barista; `can("module.ingredients")` returns `true` for that user

---

## Ordering summary (non-negotiable)

| Ordering | Must hold |
|----------|-----------|
| Seed BEFORE enforcement | `role_permissions` rows for all 10 `module.*` keys exist for cocinero+barista in production before nav/page/middleware enforcement goes live (PR1 before PR2) |
| `get_payment_accounts()` + rewiring BEFORE `accounts` SELECT restriction | The RPC must exist and non-admin flows must use it before the `accounts` RLS policy tightens (within PR3) |
| Estadisticas guard BEFORE `transactions` restriction | PR #4 must be merged before `transactions` SELECT is restricted (already merged — prerequisite satisfied) |

---

## Out of scope (do NOT specify behavior for)

- Field-level permission control (`level: "field"`) — Fase 3
- Making `/finanzas`, `/estadisticas`, `/auditoria`, or `/users` configurable — never
- Changing the tri-state override model or 4-branch resolution order (Fase 1 unchanged)
- DB-level RLS gating of ingredient/recipe reads by `module.*` key
- Full server-side `has_permission` RPC call in middleware for configurable paths (Option A)
