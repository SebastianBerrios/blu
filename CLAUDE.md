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

## Database Schema (key tables)

- **user_profiles** — role, full_name, is_active
- **categories**, **products** (with manufacturing_cost, suggested_price)
- **ingredients** (quantity, unit_of_measure, price), **recipes**, **recipe_ingredients**
- **sales** + **sale_products** — order_type (Mesa/Para llevar/Delivery), payment_method (Efectivo/Plin/Efectivo + Plin), product status (Pendiente/Entregado)
- **customers** — name, dni, phone
- **accounts** (type: "caja"/"banco", balance) + **transactions** via RPC `record_transaction(p_account_id, p_type, p_amount, p_description, p_reference_id, p_reference_type)`
- **purchases** + **purchase_items**
- **audit_logs** — action tracking (userId, action, targetTable, targetId, targetDescription)
- **inventory_movements** — stock in/out tracking (reason: "manual"/"entrega"/"compra")
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
