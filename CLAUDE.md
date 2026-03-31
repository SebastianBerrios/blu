# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Blu is a café/bakery business management system. It manages ingredients, recipes, products, categories, and sales with real-time cost calculations and price suggestions. The UI is entirely in Spanish.

## Tech Stack

- **Next.js 15** (App Router) + **React 19** with TypeScript strict mode
- **Tailwind CSS 4** (PostCSS plugin) with custom sky-blue theme via CSS variables
- **Supabase** (PostgreSQL) for database and auth (SSR cookie-based sessions)
- **SWR** for data fetching/caching, **React Hook Form** for forms
- **js-quantities** for unit conversions (kg/g, l/ml)
- **Turbopack** for dev and build

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
├── app/              # Next.js App Router pages
│   ├── categories/   # Category management
│   ├── products/     # Product management
│   ├── ingredients/  # Ingredient inventory (admin only)
│   ├── recipes/      # Recipe management (admin only)
│   ├── sales/        # Sales/orders
│   ├── pedidos/      # Pending orders
│   ├── compras/      # Purchase management
│   ├── finanzas/     # Financial dashboard (admin only)
│   ├── estadisticas/ # Statistics dashboard (admin only)
│   ├── auditoria/    # Audit log viewer (admin only)
│   ├── users/        # User management (admin only)
│   ├── login/        # Authentication (email/password + Google OAuth)
│   └── auth/callback # OAuth callback
├── components/
│   ├── forms/        # Modal form components (CategoryForm, ProductForm, SaleForm, PurchaseForm, etc.)
│   ├── ui/           # Reusable UI (Button, DataTable, Spinner, PageHeader, EmptyState, FAB, BottomNav, BottomSheet)
│   ├── SideBar/      # Desktop navigation sidebar
│   ├── AppShell.tsx  # Layout wrapper (sidebar + bottom nav)
│   └── AuthGuard.tsx # Auth + role-based access wrapper
├── hooks/            # SWR-based data hooks (useCategories, useProducts, useAuth, useSales, useAccounts, useTransactions, etc.)
├── types/            # TypeScript types including auto-generated Supabase types (database.ts)
└── utils/
    ├── supabase/     # Supabase client (client.ts for browser, server.ts for SSR, middleware.ts)
    ├── auditLog.ts   # Audit logging helper (logAudit)
    ├── saleNumber.ts # Sequential sale number generator
    └── purchaseNumber.ts # Sequential purchase number generator
```

## Key Patterns

**Pages**: Client components (`"use client"`) that use a custom SWR hook for data, `useState` for modals/selection, a `DataTable` for display, and a modal `Form` for create/edit. Deletions call Supabase directly then `mutate()` to revalidate.

**Forms**: Use React Hook Form with `useEffect` to reset on open. Handle both create and edit modes (`isEditMode = !!existingItem`). Call Supabase directly for mutations, then invoke `onSuccess` callback.

**Data Hooks**: SWR with `revalidateOnFocus: false`, `revalidateOnReconnect: true`, `dedupingInterval: 2000`. Return `{ data, error, isLoading, mutate }`.

**No global state management** — state is local to components or lifted via props.

## Authentication & Roles

- Cookie-based SSR sessions via `@supabase/ssr`
- Middleware in `src/middleware.ts` redirects unauthenticated users to `/login`
- **Roles**: `admin`, `cocinero` (chef), `barista`
- `useAuth` hook returns `{ user, profile, role, isAdmin, isPending, isInactive, signOut, hasRole }`
- Admin-only pages (`ingredients`, `recipes`, `finanzas`, `estadisticas`, `auditoria`, `users`) redirect non-admins
- Root `/` redirects by role: admin → `/categories`, others → `/sales`

## Database Schema (key tables)

- **user_profiles** — role, full_name, is_active
- **categories**, **products** (with manufacturing_cost, suggested_price)
- **ingredients** (quantity, unit_of_measure, price), **recipes**, **recipe_ingredients**
- **sales** + **sale_products** — order_type (Mesa/Para llevar/Delivery), payment_method (Efectivo/Yape/split), product status (Pendiente/Entregado)
- **customers** — name, dni, phone
- **accounts** (type: "caja"/"banco", balance) + **transactions** (ingreso_venta, egreso_compra, transferencia_in/out, gasto, ingreso_extra)
- **purchases** + **purchase_items**
- **audit_logs** — action tracking (userId, action, targetTable, targetId, targetDescription)

Types in `src/types/` wrap auto-generated Supabase types: `export type Category = Tables<"categories">`

## UI Components

- **DataTable**: Generic `<T extends { id: number; name: string }>`, supports search, sort, mobile card view via `renderCard` prop
- **Button**: Variants (primary/secondary/ghost/danger), sizes (sm/md/lg)
- **BottomNav**: Mobile navigation, shows different items by role; "More" opens BottomSheet
- **SideBar**: Desktop only (`md:flex`), icon-based navigation
- **FAB**: Floating action button for mobile add actions

## Naming Conventions

- Components/Types: PascalCase
- Variables/hooks: camelCase
- Database columns: snake_case (e.g., `unit_of_measure`, `manufacturing_cost`)
- Component folders: PascalCase, hook files: camelCase

## Styling

Tailwind utility-first, mobile-first responsive design (`md:` for desktop). Custom theme colors defined as CSS variables in `globals.css`:
- **Primary** (sky blue): `--color-primary-50` through `--color-primary-900`
- **Accent** (amber/toffee): `--color-accent-50` through `--color-accent-700`
- Icons via **Lucide React**
- Charts via **Chart.js** + **react-chartjs-2** (used in estadisticas)

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
