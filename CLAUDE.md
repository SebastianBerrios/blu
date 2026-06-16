# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Blu is a café/bakery business management system. It manages ingredients, recipes, products, categories, sales, scheduling, and inventory with real-time cost calculations and price suggestions. The UI is entirely in Spanish (`lang="es"`).

## Tech Stack

- **Next.js 15** (App Router) + **React 19** with TypeScript strict mode
- **Tailwind CSS 4** (PostCSS plugin) with custom sky-blue theme via CSS variables
- **Supabase** (PostgreSQL) for database, auth (SSR cookie-based sessions), and Realtime
- **SWR** for data fetching/caching, **React Hook Form** for forms (some newer forms use plain `useState`)
- **js-quantities** for unit conversions (kg/g, l/ml)
- **Turbopack** for dev and build
- **Inter** font (Google Fonts)

## Commands

- `npm run dev` — Start dev server (Turbopack)
- `npm run build` — Production build (Turbopack)
- `npm run lint` — ESLint
- No test framework configured

## Path Alias

`@/*` maps to `./src/*`

## Architecture

```
src/
├── app/              # Next.js App Router pages (all "use client")
│   ├── categories/   # Category management
│   ├── products/     # Product management (uses features/productos/ for AvailabilityTab)
│   ├── ingredients/  # Ingredient inventory (admin only)
│   ├── recipes/      # Recipe management (admin only)
│   ├── sales/        # Sales/orders
│   ├── pedidos/      # Pending orders
│   ├── compras/      # Purchase management
│   ├── finanzas/     # Financial dashboard (admin only)
│   ├── estadisticas/ # Statistics dashboard (admin only)
│   ├── auditoria/    # Audit log viewer (admin only)
│   ├── inventario/   # Inventory stock management + movement history (all roles)
│   ├── horario/      # Schedule, time-off requests, extra hours (all roles)
│   ├── users/        # User management (admin only)
│   ├── login/        # Authentication (email/password + Google OAuth)
│   └── auth/callback # OAuth callback
├── features/         # Feature-based modules (new code goes here)
│   ├── ventas/       # Sales sub-components (PaymentSection, ProductSelector) + salesService
│   ├── recetas/      # Recipe sub-components (IngredientSelector/List) + recipesService
│   ├── compras/      # Purchase sub-components (ItemSelector/List) + purchasesService
│   ├── inventario/   # StockTab, HistorialTab + inventoryService
│   ├── horario/      # ScheduleTab, MonthlyCalendarGrid, BalanceTab, RequestsTab + scheduleService
│   └── productos/    # AvailabilityTab + productAvailabilityService
├── components/
│   ├── forms/        # Modal form components (legacy + schedule/HR forms)
│   ├── ui/           # Reusable UI (Button, DataTable, Spinner, PageHeader, EmptyState, FAB, BottomNav, BottomSheet)
│   ├── SideBar/      # Desktop navigation sidebar
│   ├── AppShell.tsx  # Layout wrapper (sidebar + bottom nav)
│   └── AuthGuard.tsx # Auth + role-based access wrapper (handles loading/pending/inactive states)
├── hooks/            # SWR-based data hooks + useModalState utility hook
├── types/            # TypeScript types (database.ts is auto-generated, domain types in separate files, re-exported from index.ts)
└── utils/
    ├── supabase/     # Supabase client (client.ts for browser, server.ts for SSR, middleware.ts)
    ├── helpers/      # Shared utilities: dateFormatters, groupByDate, deleteWithAudit (barrel: index.ts)
    ├── auditLog.ts   # Fire-and-forget audit logging (never throws)
    ├── saleNumber.ts # Sequential sale number generator
    └── purchaseNumber.ts # Sequential purchase number generator
```

## Key Patterns

### Page Pattern
All data pages follow this structure:
1. `"use client"` + SWR hook for data + `useAuth()` for permissions
2. `useState` for modal open/close and selected item (new code can use `useModalState<T>()` hook)
3. `PageHeader` → `DataTable` (with `renderCard` for mobile) → modal `Form`
4. `FAB` for mobile add button
5. Delete: use `deleteWithAudit()` helper (new code) or call Supabase directly → `logAudit()` → `mutate()` (legacy)
6. Role check: `isAdmin` or `hasRole()` to show/hide actions

**Tab-based pages** (`horario`, `inventario`) use local `useState` for active tab instead of URL params.

### Form Pattern
Modal forms accept `{ isOpen, onClose, onSuccess, item? }`:
- `isEditMode = !!item` — toggles create vs. edit
- `useForm()` with `reset()` in `useEffect` on `isOpen` change
- Return `null` if `!isOpen`
- Backdrop click calls `onClose`, content has `e.stopPropagation()`
- Submit: call Supabase directly → `onSuccess()` callback (parent calls `mutate()`)
- Button text: "Guardar" (create) / "Actualizar" (edit)

**Exception**: Schedule/HR forms (`ScheduleTemplateForm`, `ScheduleOverrideForm`, `TimeOffRequestForm`, `ExtraHoursForm`, `TimeOffReviewForm`) use plain `useState` instead of `react-hook-form`. `TimeOffReviewForm` has "Aprobar"/"Rechazar" buttons instead of the standard pattern.

### Data Hooks (SWR)
All hooks use identical config: `{ revalidateOnFocus: false, revalidateOnReconnect: true, dedupingInterval: 2000 }`.
Return `{ data: T[], error, isLoading, mutate }` — data defaults to `[]` via `?? []`, never undefined.
Hooks with filters use composite SWR keys: `["transactions", filters]`.

**Notable hook exceptions**:
- `usePendingOrders` — subscribes to **Supabase Realtime** (`postgres_changes` on `sale_products`) for live updates. Only hook using Realtime.
- `useInventory` — returns two separate mutate functions: `mutateIngredients` and `mutateMovements`.
- `useSalesStats` — uses `dedupingInterval: 5000` (not 2000).
- `useSchedule`, `useMonthSchedule`, `useTimeOffRequests`, `useExtraHours` — role-aware hooks that use `[isAdmin, user?.id]` in SWR key, returning `null` key while auth is loading.
- `useModalState<T>()` — generic modal state hook (not SWR). Use for new code; existing pages keep their `useState` pattern.
- `useAuditLogs`, `useAccounts`, `useTransactions` — standard SWR hooks with filter support.

**No global state management** — state is local to components or lifted via props.

## Authentication & Roles

- Cookie-based SSR sessions via `@supabase/ssr`
- Middleware in `src/middleware.ts` redirects unauthenticated users to `/login`
- **Roles** (`AppRole`): `admin`, `cocinero` (chef), `barista`
- `useAuth` returns `{ user, profile, role, isAdmin, isPending, isInactive, isLoading, signOut, hasRole, mutate }`
- `AuthGuard` renders different screens: spinner (loading), null (!user), deactivated message (isInactive), "awaiting approval" (isPending)
- Admin-only pages (`ingredients`, `recipes`, `finanzas`, `estadisticas`, `auditoria`, `users`) redirect non-admins
- All-role pages: `sales`, `pedidos`, `compras`, `inventario`, `horario` (with admin-specific actions within)
- Root `/` redirects by role: admin → `/categories`, others → `/sales`
- Navigation items have `adminOnly?: true` flag to filter by role in SideBar/BottomNav

## Database Security (RLS)

After the security audit (2026-05-04), all tables enforce RLS with this model. Code that bypasses these patterns will fail in production.

- **Catalog tables**:
  - `categories`, `ingredient_groups`: SELECT for any auth; INSERT/UPDATE/DELETE admin-only.
  - `recipes`, `recipe_ingredients`: SELECT/INSERT/UPDATE/DELETE for any auth (relaxed 2026-05-06 to support non-admin recipe edits in `/products`).
  - `products`, `ingredients`: SELECT/UPDATE for any auth; INSERT/DELETE admin-only. UI gates non-cost fields, but the RLS allows full row UPDATE — rely on UI for column-level control.
- **Operational tables** (`sales`, `sale_products`, `purchases`, `purchase_items`, `customers`): SELECT/INSERT/UPDATE open to any auth user. DELETE: admin-only for `sales`, `purchases`, `customers`; auth for `sale_products`, `purchase_items`.
- **Personal tables** (`time_off_requests`, `task_completions`, `extra_hours_log`): users see/write their own rows; admins see all.
- **Financial tables** (`transactions`, `inventory_movements`, `accounts`): direct INSERT is **blocked** for everyone — must go through SECURITY DEFINER RPCs. Direct UPDATE on `accounts` is admin-only.
- **`audit_logs`**: INSERT requires `user_id IS NULL OR user_id = auth.uid()` (no impersonation). SELECT admin-only.

**SECURITY DEFINER RPCs** (callable by `authenticated`, NOT by `anon`):
- `record_transaction(...)` — sole entry point to create transactions. Use `recordTransaction` from `src/hooks/useTransactions.ts`.
- `deduct_inventory_for_delivery(p_sale_product_id, ...)` — sole entry point for stock deduction on delivery.
- `reverse_inventory_for_sale(p_sale_id, ...)` — used when deleting a sale.
- `apply_purchase_inventory(p_purchase_id, ...)` / `reverse_purchase_inventory(p_purchase_id, ...)` — add/remove stock for purchase items linked to an ingredient (quantity in the ingredient's stock unit). Reversal runs inside `update_purchase_atomic`/`delete_purchase_atomic`.
- `discard_inventory(p_ingredient_id, p_quantity, p_note, ...)` — write-off (merma); reason `merma`, motivo in `note`.
- `produce_recipe_batch(p_ingredient_id, p_batches, ...)` / `reverse_production(p_production_id, ...)` — batch production of an intermediate good (see Inventory model below). `_convert_qty(qty, from, to)` is the shared kg/g·l/ml helper.
- `delete_sale_transactions(p_sale_id)` — callable by any auth user (admin-check removed 2026-05-06 to enable non-admin sale edits via `updateSale`).
- `delete_purchase_transactions(p_purchase_id)` — callable by any auth user (same change).
- `approve_time_off_request(p_request_id, p_admin_id, ...)` — **admin-check inside** + `p_admin_id` must equal `auth.uid()`.

When adding new destructive RPCs, follow the same pattern: `SECURITY DEFINER`, `SET search_path = public, pg_temp`, REVOKE EXECUTE FROM PUBLIC/anon, and `IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin') THEN RAISE EXCEPTION ...`.

## Inventory Model (two-stage, since 2026-06-14)

Stock lives in `ingredients.stock_quantity` (NOT the legacy `quantity` column). All stock changes go through SECURITY DEFINER RPCs and log to `inventory_movements`. **`inventory_movements.reason`** values (no CHECK constraint): `manual`, `entrega` / `reverso_entrega` (sale delivery), `compra` / `reverso_compra` (purchase), `merma` (write-off, motivo in `note`), `produccion` (finished output) / `produccion_consumo` (raw consumed) / `reverso_produccion`.

Two product kinds, to avoid double-counting:
- **Made-to-order** (e.g. coffee): the sold product's recipe lists raw ingredients; selling/delivering deducts them directly via `deduct_inventory_for_delivery`.
- **Batch goods** (e.g. brownies): modeled as an **intermediate good** = an `ingredient` with `recipe_id` set (the StockTab shows these with a "Producible" badge and no purchase button). Producing a batch (`produce_recipe_batch`) consumes the recipe's raw ingredients and adds `recipe.quantity × batches` finished units to the intermediate's stock. The sold product's recipe should reference the **finished-good ingredient** (1 unit), so selling deducts the finished unit, not the raw materials again. The `recipes.quantity`/`unit_of_measure` ("Rendimiento") is the batch yield and is required for production. `recipe_ingredients.quantity` and `recipes.quantity` are Postgres `real` — cast `::numeric` when passing to numeric functions.

UI: `/inventario` tabs — Stock (adjust/discard/alerts for all ingredients incl. intermediates), Compras (needs_purchase list), Producción (produce batches + undo), Historial (movements). Services in `src/features/inventario/services/` (`inventoryService`, `productionService`); hook `useProduction`.

### Units of measure (since 2026-06-15)
- **Single source of truth: `src/utils/helpers/units.ts`** — `UNIT_OPTIONS`, `dimensionOf` (peso/volumen/conteo), `convert(qty,from,to,gramsPerUnit?)`, `areCompatible`, `compatibleUnits`, `normalizeUnit`. Used by `recipeCalculations.calculateIngredientCost` and `productionService.convertQty`. The SQL `_convert_qty(p_qty,p_from,p_to,p_grams_per_unit)` **mirrors** `convert()` — keep them in sync.
- `convert`: kg↔g, l↔ml; same unit → qty; **incompatible → `null`**. Custom units (`rodaja`, `taza`) only convert to themselves. `unit_of_measure` is free text (datalist combobox in `IngredientForm`/`RecipeYieldSection`, normalized with `normalizeUnit`).
- **`ingredients.unit_weight_g`** (grams per 1 `und`): the **peso↔unidad bridge**. When set, `und ↔ g ↔ kg` are interconvertible for that ingredient, so the same item can be used **by weight or by count** (e.g. naranja in kg with `unit_weight_g=185`: recipe `2 und` = 370 g, or `350 g` directly; fractions like `0.5 palta` work). Pass the factor to `convert`/`calculateIngredientCost`/`compatibleUnits`/`areCompatible`. Set it in `IngredientForm` ("Peso por unidad (g)").
- **Recipe lines** (`IngredientSelector`) constrain the unit to `compatibleUnits(ingredient.unit_of_measure, ingredient.unit_weight_g)`: peso→kg/g, volumen→l/ml, conteo/custom→that unit; **with a factor → kg/g/und**. Incompatible lines show a visible "unidad incompatible" warning in `IngredientList` instead of a silent S/0.00.
- **Juice = produced intermediate** (not a weight conversion): `zumo de naranja`, `jugo de limón` are ingredients in `ml` with a recipe that consumes the fruit (e.g. 1 limón ≈ 10 ml). Drinks consume exact ml; producing the juice deducts the fruit.
- **Purchases** (`ItemSelector`/`purchase_items.unit`): the line unit is selectable from `compatibleUnits`; `apply_purchase_inventory` converts the bought qty to the ingredient's stock unit via `_convert_qty` + factor (buy naranja in kg or und).
- `js-quantities` removed (unused; doesn't handle count/portion units). **Package manager: pnpm** (`pnpm-lock.yaml`) — use `pnpm install`, not npm.

## Database Schema (key tables)

- **user_profiles** — role, full_name, is_active
- **categories**, **products** (with manufacturing_cost, suggested_price)
- **ingredients** (quantity, unit_of_measure, price), **recipes**, **recipe_ingredients**
- **sales** + **sale_products** — order_type (Mesa/Para llevar/Delivery), payment_method (Efectivo/Plin/Efectivo + Plin), product status (Pendiente/Entregado)
- **customers** — name, dni, phone
- **accounts** (type: "caja"/"banco", balance) + **transactions** via RPC `record_transaction(p_account_id, p_type, p_amount, p_description, p_reference_id, p_reference_type)`
- **purchases** + **purchase_items**
- **audit_logs** — action tracking (userId, action, targetTable, targetId, targetDescription)
- **inventory_movements** — stock in/out tracking (reason: manual/entrega/reverso_entrega/compra/reverso_compra/merma/produccion/produccion_consumo/reverso_produccion; optional `note`)
- **productions** — batch production log (ingredient_id, recipe_id, batches, yield_added, reversed_at/by) for traceability + undo
- **schedule_templates** — recurring weekly schedule (user_id, day_of_week 0=Mon..5=Sat, start_time, end_time)
- **schedule_overrides** — one-time schedule changes (override_date, is_day_off, optional time range, linked to time_off_request_id)
- **time_off_requests** — employee time-off requests (status: pendiente/aprobado/rechazado, hours_requested, is_full_day)
- **extra_hours_log** — credit/debit ledger (positive=credit, negative=debit from approved time-off)

**Key RPCs**:
- `record_transaction(...)` — creates a transaction and updates account balance atomically
- `approve_time_off_request(p_request_id, p_admin_id, p_review_note?)` — atomically approves request, debits hours, and creates a schedule override
- `deduct_inventory_for_delivery(p_sale_product_id, p_user_id?, p_user_name?)` — deducts recipe ingredients from stock when a sale product is marked "Entregado"

## Type Patterns

Types in `src/types/` wrap auto-generated Supabase types and are re-exported from `src/types/index.ts`:
- **Base types**: `export type Category = Tables<"categories">`
- **Extended interfaces**: `SaleWithProducts extends Sale` (adds `sale_products[]`, `creator_name?`), `TransactionWithUser extends Transaction` (adds `user_name`)
- **Create/Update types**: Separate interfaces like `CreateSale`, `CreateProduct`
- **Literal unions**: `PaymentMethod = "Efectivo" | "Plin" | "Efectivo + Plin"`, `TransactionType = "ingreso_venta" | "egreso_compra" | ...`, `TimeOffStatus = "pendiente" | "aprobado" | "rechazado"`
- **Filters**: `SalesFilters`, `TransactionFilters` for hook parameters
- **Schedule types** in `src/types/schedule.ts`: `ScheduleSlot` (merged template+override for weekly display), `EmployeeBalance`, `DayOfWeek` (0–5, Mon–Sat, 6-day work week), `DAY_LABELS`

## UI Components

- **DataTable**: Generic `<T extends { id: number; name: string }>`. Props: `columns`, `dataKeys`, `data`, `isLoading?`, `onEdit?`, `onDelete?`, `canEdit?(item)` (shows lock icon if false), `renderCard?(item, onEdit?, onDelete?)`. Features: search (Spanish locale-aware), sortable columns, mobile card view via `renderCard`
- **Button**: Variants (primary/secondary/ghost/danger), sizes (sm/md/lg)
- **BottomNav**: Mobile-only navigation, role-filtered; "More" opens BottomSheet with additional items
- **SideBar**: Desktop only (`hidden md:flex`), icon-based, role-filtered
- **FAB**: Floating action button for mobile add actions

## Naming Conventions

- Components/Types: PascalCase
- Variables/hooks: camelCase
- Database columns: snake_case (e.g., `unit_of_measure`, `manufacturing_cost`)
- Component folders: PascalCase, hook files: camelCase

## Styling

Tailwind utility-first, mobile-first responsive design (`md:` breakpoint for desktop). Root layout uses `h-dvh` for full-screen. Custom theme colors defined as CSS variables in `globals.css`:
- **Primary** (sky blue): `--color-primary-50` through `--color-primary-900`
- **Accent** (amber/toffee): `--color-accent-50` through `--color-accent-700`
- Role colors in schedule: `cocinero` (sky), `barista` (amber), `admin` (purple)
- Form focus: `focus:ring-2 focus:ring-primary-500 focus:border-transparent`
- Icons via **Lucide React**
- Charts via **Chart.js** + **react-chartjs-2** (used in estadisticas)
- Spanish locale used for sorting (`localeCompare("es")`) and date formatting

## Skill Orchestration (Regla siempre activa)

Para CUALQUIER tarea en este proyecto (crear, modificar, refactorizar, fix, renombrar, nueva lógica), el punto de entrada es **siempre** `/cafeteria-architecture`. Esta skill actúa como orquestador y delega a skills especializadas según el tipo de tarea:

- UI (componentes, páginas, forms, modales, tablas, dashboards) → `/frontend-design`
- React / Next.js (hooks, data fetching, performance, re-renders) → `/vercel-react-best-practices`
- Después de cambios React → `/react-doctor`
- Supabase (DB, auth, RLS, queries, migrations, RPCs) → `/supabase`
- Postgres performance (SQL, índices, schema) → `/supabase-postgres-best-practices`

Ver `.claude/skills/cafeteria-architecture/SKILL.md` para la matriz completa de qué skills invocar por tipo de tarea.

## Arquitectura del Proyecto

- **Feature-Based Architecture pragmática** — migration Phases 0–3 complete (helpers extracted, god forms decomposed, services created, barrel exports done)
- **Capas**: `types` → `services` → `hooks` → `components` → `pages` (nunca al revés)
- **Código nuevo**: usar `features/[nombre]/` con service layer obligatorio — componentes nunca llaman `createClient()` directamente
- **Código existente**: migrar solo cuando se toca significativamente — cambios menores respetan el patrón actual
- **Shared utilities**: `utils/helpers/` has `dateFormatters.ts`, `groupByDate.ts`, `deleteWithAudit.ts` (barrel: `index.ts`)
- **Límites de tamaño**: Page <200 LOC, Form <300 LOC, Hook <200 LOC, Service <150 LOC
- **Error handling** (código nuevo): Service throws → Hook catches → Component muestra error inline (no `alert()`)
- **Skills a consultar**: ver sección "Skill Orchestration" arriba — `cafeteria-architecture` es el entry point obligatorio y delega según tipo de tarea
- **Feature modules**: `ventas`, `recetas`, `compras`, `inventario`, `horario`, `productos` — each with `components/`, `services/`, barrel `index.ts`
- Ver `.claude/skills/cafeteria-architecture/SKILL.md` para reglas completas

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
