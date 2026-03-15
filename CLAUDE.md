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
├── app/              # Next.js App Router pages (categories, products, ingredients, recipes, sales)
├── components/
│   ├── forms/        # Modal form components (CategoryForm, ProductForm, RecipeForm, IngredientForm)
│   ├── ui/           # Reusable UI (Button, DataTable, Spinner)
│   └── SideBar/      # Navigation sidebar
├── hooks/            # SWR-based data hooks (useCategories, useProducts, useIngredients, useRecipes, etc.)
├── types/            # TypeScript types including auto-generated Supabase types (database.ts)
└── utils/supabase/   # Supabase client (client.ts for browser, server.ts for SSR)
```

## Key Patterns

**Pages**: Client components (`"use client"`) that use a custom SWR hook for data, `useState` for modals/selection, a `DataTable` for display, and a modal `Form` for create/edit. Deletions call Supabase directly then `mutate()` to revalidate.

**Forms**: Use React Hook Form with `useEffect` to reset on open. Handle both create and edit modes (`isEditMode = !!existingItem`). Call Supabase directly for mutations, then invoke `onSuccess` callback.

**Data Hooks**: SWR with `revalidateOnFocus: false`, `revalidateOnReconnect: true`, `dedupingInterval: 2000`. Return `{ data, error, isLoading, mutate }`.

**No global state management** — state is local to components or lifted via props.

## Naming Conventions

- Components/Types: PascalCase
- Variables/hooks: camelCase
- Database columns: snake_case (e.g., `unit_of_measure`, `manufacturing_cost`)
- Component folders: PascalCase, hook files: camelCase

## Styling

Tailwind utility-first, mobile-first responsive design (`md:` for desktop). Custom theme colors defined as `--color-primary-*` CSS variables (sky blue palette) in `globals.css`.

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
