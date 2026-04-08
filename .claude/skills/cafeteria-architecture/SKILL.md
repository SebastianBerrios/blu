---
name: cafeteria-architecture
description: >
  Enforces architecture, design principles, and coding standards for a Next.js + Supabase + TypeScript
  cafeteria management system (finance, inventory, products, sales). Use this skill whenever creating,
  modifying, or reviewing any feature, component, hook, service, type, or utility in the cafeteria project.
  Triggers on: adding new features, creating components, writing hooks, building services, defining types,
  refactoring code, reviewing pull requests, or any code generation task for this project. Also triggers
  when the user mentions "nueva funcionalidad", "nuevo módulo", "agregar feature", "crear componente",
  "refactorizar", or asks how to structure/organize code in the cafeteria system. Even if the user just
  says "add a button" or "create a page" — if it's in the cafeteria project context, use this skill.
---

# Blu Cafeteria — Architecture & Code Standards

> **Regla de oro**: Esta app está en producción y funciona bien. Migrar gradualmente, nunca reescribir. El código nuevo sigue las reglas nuevas; el código existente se migra solo cuando se toca.

## Quick Decision Guide

Antes de escribir código, responde:

1. **Es código nuevo o modificación?**
   - **Nuevo módulo/feature** → Crear en `src/features/[nombre]/` con service layer
   - **Modificación menor** a código existente → Respetar el patrón actual del archivo
   - **Refactor significativo** de código existente → Migrar a `features/` (ver `references/migration.md`)

2. **Dónde vive este código?**
   - Habla con Supabase → Service (`features/[nombre]/services/` o `utils/`)
   - Maneja cache/estado servidor → Hook (`hooks/` o `features/[nombre]/hooks/`)
   - Renderiza UI → Component (`components/` o `features/[nombre]/components/`)
   - Se usa en 3+ lugares → `utils/helpers/` o `utils/constants/`

3. **Es un componente visual o una página?**
   - **Sí** → Antes de escribir código de UI, consultar la skill `frontend-design` para seguir los estándares de diseño del proyecto.

## Mapa de Arquitectura Actual

```
src/                              # ~14,672 LOC total
├── app/                          # Next.js App Router — 17 páginas (todas "use client")
│   ├── categories/page.tsx       #  130 LOC ✅ Referencia — página CRUD simple
│   ├── ingredients/page.tsx      #  132 LOC ✅
│   ├── recipes/page.tsx          #  133 LOC ✅
│   ├── products/page.tsx         #  218 LOC ✅
│   ├── users/page.tsx            #  256 LOC ⚠️ Tiene formatDate duplicado
│   ├── pedidos/page.tsx          #  260 LOC ⚠️
│   ├── auditoria/page.tsx        #  265 LOC ⚠️ Tiene formatDate + groupByDate inline
│   ├── finanzas/page.tsx         #  272 LOC ⚠️
│   ├── compras/page.tsx          #  345 LOC ⚠️ Tiene formatDate duplicado
│   ├── estadisticas/page.tsx     #  391 LOC ⚠️
│   ├── inventario/page.tsx       #  453 LOC ⚠️ Tab-based, tiene formatDate
│   ├── sales/page.tsx            #  487 LOC ⚠️ Tiene formatDate + groupByDate
│   ├── horario/page.tsx          #  968 LOC ❌ God page — 7+ sub-componentes inline
│   ├── login/page.tsx            #      — Auth page
│   └── auth/callback/            #      — OAuth callback
│
├── components/
│   ├── forms/                    # Modal forms
│   │   ├── CategoryForm/         #  144 LOC ✅ Referencia — form CRUD simple
│   │   ├── ProductForm/          #      ✅
│   │   ├── IngredientForm/       #      ✅
│   │   ├── PurchaseForm/         #  759 LOC ❌ God form
│   │   ├── SaleForm/             #  999 LOC ❌ God form (4 responsabilidades)
│   │   ├── RecipeForm/           # 1066 LOC ❌ God form
│   │   ├── ScheduleTemplateForm/ #      ✅ (usa useState, no react-hook-form)
│   │   ├── ScheduleOverrideForm/ #      ✅
│   │   ├── TimeOffRequestForm/   #      ✅
│   │   ├── TimeOffReviewForm/    #      ✅ (Aprobar/Rechazar, no Guardar/Actualizar)
│   │   └── ExtraHoursForm/       #      ✅
│   ├── ui/                       # Componentes compartidos
│   │   ├── DataTable/            #      ✅ Generic <T>
│   │   ├── Button/               #      ✅
│   │   ├── PageHeader/           #      ✅
│   │   ├── EmptyState/           #      ✅
│   │   ├── FAB/                  #      ✅
│   │   ├── BottomNav/            #      ✅
│   │   ├── BottomSheet/          #      ✅
│   │   └── Spinner/              #      ✅
│   ├── SideBar/                  #      ✅
│   ├── AppShell.tsx              #      ✅
│   └── AuthGuard.tsx             #      ✅
│
├── hooks/                        # SWR-based data hooks
│   ├── useCategories.ts          #   30 LOC ✅ Referencia — hook simple
│   ├── useProducts.ts            #   30 LOC ✅
│   ├── useInventory.ts           #   67 LOC ✅ (dual mutate)
│   ├── useTimeOffRequests.ts     #   76 LOC ✅
│   ├── useExtraHours.ts          #  103 LOC ✅
│   ├── useSales.ts               #  127 LOC ✅ (tiene toLocalDateKey + groupByDate)
│   ├── usePurchases.ts           #      ✅ (reutiliza toLocalDateKey)
│   ├── useSchedule.ts            #  193 LOC ✅
│   ├── usePendingOrders.ts       #  226 LOC ✅ (Realtime subscription)
│   ├── useAuth.ts                #      ✅ Singleton de autenticación
│   └── useSalesStats.ts          #      ✅ (dedupingInterval: 5000)
│
├── types/                        # TypeScript types con barrel export
│   ├── database.ts               #      Auto-generado por Supabase
│   ├── index.ts                  #   17 LOC ✅ Barrel re-export
│   ├── sales.ts                  #   58 LOC ✅ Referencia — tipos segregados
│   ├── products.ts               #      ✅
│   ├── categories.ts             #      ✅
│   ├── ingredients.ts            #      ✅
│   ├── recipes.ts                #      ✅
│   ├── purchases.ts              #      ✅
│   ├── finance.ts                #      ✅
│   ├── customers.ts              #      ✅
│   ├── stats.ts                  #      ✅
│   ├── auditLog.ts               #      ✅
│   ├── inventoryMovements.ts     #      ✅
│   └── schedule.ts               #      ✅
│
└── utils/
    ├── supabase/                 # Supabase clients
    │   ├── client.ts             #      Browser client (createClient)
    │   ├── server.ts             #      SSR client
    │   └── middleware.ts         #      Auth middleware
    ├── auditLog.ts               #   27 LOC ✅ Referencia — fire-and-forget
    ├── saleNumber.ts             #      ✅
    └── purchaseNumber.ts         #      ✅
```

## Arquitectura Objetivo (Migración Gradual)

```
src/
├── app/              → Orquestación de páginas (objetivo: < 200 LOC cada una)
├── features/         → NUEVO: Solo para features nuevas o migraciones explícitas
│   └── [feature]/
│       ├── components/
│       ├── services/   → Llamadas Supabase extraídas aquí
│       └── utils/
├── components/       → MANTENER tal cual (forms/, ui/, SideBar, AppShell, AuthGuard)
├── hooks/            → MANTENER tal cual (SWR hooks existentes)
├── types/            → MANTENER tal cual (barrel export desde index.ts)
└── utils/
    ├── supabase/     → MANTENER
    ├── constants/    → NUEVO: statusStyles, paymentMethods, etc.
    └── helpers/      → NUEVO: dateFormatters, groupByDate, etc.
```

### Reglas de Coexistencia

- Código en `hooks/`, `components/`, `types/` → Patrón actual, funciona bien, no mover sin razón
- Features nuevas → `features/[nombre]/` con service layer obligatorio
- Al refactorizar un archivo existente significativamente → Migrar a `features/`
- `utils/helpers/` y `utils/constants/` → Para código compartido extraído (3+ usos)

## Reglas de Capas

```
types → services → hooks → components → pages
```

**Nunca al revés.** Un hook no importa un componente. Un service no importa un hook.

| Capa | Puede importar de | Nunca importa de |
|------|-------------------|------------------|
| `types/` | Solo otros types | Todo lo demás |
| `utils/`, `services/` | types, otros utils | hooks, components, pages |
| `hooks/` | types, services, utils, otros hooks | components, pages |
| `components/` | types, hooks, utils, otros components | pages |
| `app/` (pages) | Todo lo anterior | — |

### Feature-to-Feature

- `features/A/` **nunca** importa de `features/B/`
- Si dos features necesitan compartir lógica → promover a `utils/` o `hooks/`
- Si una page necesita datos de dos features → componer en la page

## Límites de Tamaño

| Tipo | Máximo | Referencia real |
|------|--------|----------------|
| Page (`app/`) | 200 LOC | `categories/page.tsx` (130) |
| Form (`components/forms/`) | 300 LOC | `CategoryForm` (144) |
| Hook (`hooks/`) | 200 LOC | `useCategories.ts` (30) |
| Service | 150 LOC | — |
| Utility | 50 LOC | `auditLog.ts` (27) |

Si un archivo excede su límite → extraer sub-componentes, servicios, o helpers.

**Excepciones documentadas** (código existente que excede pero funciona):
- `SaleForm` (999 LOC) — prioridad de migración alta
- `RecipeForm` (1066 LOC) — prioridad de migración alta
- `PurchaseForm` (759 LOC) — prioridad de migración media
- `horario/page.tsx` (968 LOC) — prioridad de migración alta
- `usePendingOrders` (226 LOC) — aceptable, usa Realtime

## Convenciones de Naming

Estas son las convenciones **reales** del proyecto:

| Qué | Convención | Ejemplo real |
|-----|-----------|-------------|
| Carpetas de componentes | PascalCase | `CategoryForm/`, `DataTable/` |
| Archivos de hooks | camelCase con `use` | `useCategories.ts`, `useSales.ts` |
| Archivos de tipos | camelCase | `sales.ts`, `auditLog.ts` |
| Archivos de utils | camelCase | `auditLog.ts`, `saleNumber.ts` |
| Carpetas de pages | kebab-case | `categories/`, `horario/` |
| Interfaces/Types | PascalCase | `SaleWithProducts`, `CreateSale` |
| Funciones | camelCase | `logAudit`, `formatDate` |
| DB columns | snake_case | `unit_of_measure`, `manufacturing_cost` |
| Constantes | camelCase o UPPER_SNAKE | Según contexto |

### Regla de Idioma

- **UI (texto visible)**: Siempre en español — "Guardar", "Categorías", "Error al cargar"
- **Código (variables, funciones, types)**: Siempre en inglés — `handleDelete`, `isLoading`, `SaleWithProducts`
- **DB tables/columns**: snake_case en inglés — `sale_products`, `unit_of_measure`
- **Excepciones aceptadas**: Nombres de dominio en español cuando son literales del negocio — `"Efectivo"`, `"Yape"`, `"Mesa"`, `"Para llevar"`, `"Pendiente"`, `"Entregado"`, `"pendiente"`, `"aprobado"`, `"rechazado"`

## Reglas para Código Nuevo vs Existente

### Código NUEVO (features, componentes, hooks, utils nuevos)

1. **Service layer obligatorio** — componentes nunca llaman `createClient()` directamente
2. **Workflow**: types → services → hooks → components → page
3. **Al llegar al paso de components y page**: consultar la skill `frontend-design` para seguir los estándares de diseño del proyecto
4. **Respetar límites de tamaño** estrictamente
5. **Error handling**: Service throws → Hook catches → Component muestra error UI (no `alert()`)
6. **Tipos explícitos**: Return types en services y funciones exportadas
7. **SWR config estándar**: `{ revalidateOnFocus: false, revalidateOnReconnect: true, dedupingInterval: 2000 }`

### Código EXISTENTE (cuando se modifica)

1. **Cambio menor** (fix, ajuste de UI) → Respetar patrón actual del archivo
2. **Cambio significativo** (nueva funcionalidad, refactor) → Migrar hacia arquitectura objetivo
3. **Nunca romper** lo que funciona solo por "limpiar"
4. **Si toca un archivo con problemas conocidos** (god form, código duplicado) → Considerar migrar esa parte

### Lo que NO tocar (funciona bien, no cambiar)

- `useCategories.ts`, `useProducts.ts` y hooks SWR simples
- `CategoryForm`, `ProductForm`, `IngredientForm` y forms simples
- `categories/page.tsx`, `ingredients/page.tsx`, `recipes/page.tsx` — páginas de referencia
- `AuthGuard.tsx`, `AppShell.tsx`, `useAuth.ts`
- Todos los componentes en `ui/` (DataTable, Button, PageHeader, etc.)
- `logAudit()` y utilities en `utils/`
- Barrel export en `types/index.ts` y archivos de tipos

## Problemas Conocidos (Deuda Técnica)

| Problema | Severidad | Archivos afectados |
|----------|-----------|-------------------|
| `formatDate()` duplicado en 8 archivos | Media | sales, compras, auditoria, inventario, users, estadisticas, horario, TimeOffReviewForm |
| `groupByDate()` duplicado en 3 lugares | Baja | useSales, usePurchases, auditoria/page |
| God forms (>750 LOC) | Alta | SaleForm, RecipeForm, PurchaseForm |
| God page (968 LOC) | Alta | horario/page.tsx |
| `alert()` para errores (39 llamadas) | Media | Principalmente en forms complejos |
| No hay service layer | Media | Pages y forms llaman `createClient()` directo |

Ver `references/migration.md` para el plan de resolución gradual.

## Checklist Rápida: Código Nuevo

- [ ] Types definidos primero (en `types/` o `features/[nombre]/types/`)
- [ ] Service layer para llamadas Supabase
- [ ] Hook SWR con config estándar para lectura
- [ ] Componente < límite de LOC
- [ ] UI en español, código en inglés
- [ ] Sin `alert()` — usar error state en UI
- [ ] Sin `createClient()` en componentes (solo en services/hooks)
- [ ] `logAudit()` en operaciones de escritura
- [ ] Skill `frontend-design` consultada para UI

## Checklist Rápida: Modificar Código Existente

- [ ] Leí el archivo completo antes de modificar
- [ ] Respeto el patrón actual si es cambio menor
- [ ] Si es cambio grande, considero migrar a `features/`
- [ ] No introduzco nuevas duplicaciones (buscar si ya existe un helper)
- [ ] Si toco `formatDate` → usar futuro `utils/helpers/dateFormatters.ts`
- [ ] Si toco `groupByDate` → usar futuro `utils/helpers/groupByDate.ts`

## Reference Files

- `references/principles.md` — SOLID con ejemplos reales del proyecto Blu
- `references/patterns.md` — Templates de código basados en archivos de referencia
- `references/migration.md` — Plan de migración gradual con fases y checklists
