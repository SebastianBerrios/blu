# Plan de Migración Gradual — Blu Cafeteria

> **Principio**: App en producción. Migrar gradualmente, nunca reescribir. El código nuevo sigue las reglas nuevas; el existente se migra solo cuando se toca.

---

## Tabla Comparativa: Estado Actual → Objetivo

| Carpeta/Archivo | Estado Actual | Estado Objetivo | Prioridad |
|----------------|--------------|-----------------|-----------|
| `src/types/` | ✅ Bien organizado, barrel export | Mantener igual | — |
| `src/hooks/` (simples) | ✅ SWR hooks limpios (30-127 LOC) | Mantener igual | — |
| `src/hooks/usePendingOrders.ts` | ✅ 226 LOC, Realtime | Mantener (justificado) | — |
| `src/utils/auditLog.ts` | ✅ Fire-and-forget, 27 LOC | Mantener igual | — |
| `src/utils/supabase/` | ✅ Client/Server/Middleware | Mantener igual | — |
| `src/components/ui/` | ✅ Componentes compartidos limpios | Mantener igual | — |
| `src/components/AuthGuard.tsx` | ✅ Auth wrapper | Mantener igual | — |
| `src/components/AppShell.tsx` | ✅ Layout wrapper | Mantener igual | — |
| `src/app/categories/` | ✅ 130 LOC — referencia | Mantener como referencia | — |
| `src/app/ingredients/` | ✅ 132 LOC | Mantener | — |
| `src/app/recipes/` | ✅ 133 LOC | Mantener | — |
| `src/app/products/` | ✅ 218 LOC | Mantener | — |
| `src/components/forms/CategoryForm/` | ✅ 144 LOC — referencia | Mantener como referencia | — |
| `src/components/forms/ProductForm/` | ✅ Limpio | Mantener | — |
| `src/components/forms/IngredientForm/` | ✅ Limpio | Mantener | — |
| `src/components/forms/Schedule*Form/` | ✅ Limpios (useState) | Mantener | — |
| — | — | — | — |
| `formatDate()` (8 archivos) | ✅ Centralizado | `utils/helpers/dateFormatters.ts` | **Fase 0** ✅ |
| `groupByDate()` (3 archivos) | ✅ Centralizado | `utils/helpers/groupByDate.ts` | **Fase 0** ✅ |
| `deleteWithAudit()` | ✅ Centralizado | `utils/helpers/deleteWithAudit.ts` | **Fase 0** ✅ |
| — | — | — | — |
| `src/app/horario/page.tsx` | ✅ 240 LOC, orquestadora | `features/horario/` (12 archivos) | **Fase 1** ✅ |
| `src/components/forms/SaleForm/` | ✅ ~300 LOC | `features/ventas/` (service+components) | **Fase 1** ✅ |
| `src/components/forms/RecipeForm/` | ✅ ~300 LOC | `features/recetas/` (service+components) | **Fase 1** ✅ |
| `src/components/forms/PurchaseForm/` | ✅ ~300 LOC | `features/compras/` (service+components) | **Fase 1** ✅ |
| — | — | — | — |
| `src/app/inventario/page.tsx` | ✅ Extraído a tabs | `features/inventario/` (service+components) | **Fase 2** ✅ |
| Deletes en pages | ✅ Service layer | `utils/helpers/deleteWithAudit.ts` | **Fase 2** ✅ |
| — | — | — | — |
| Type casts | ✅ 4 mejorables limpiados | 19 necesarios restantes | **Fase 3** ✅ |
| `any` types | ✅ 0 encontrados | Codebase limpio | **Fase 3** ✅ |
| Barrel exports | ✅ 6 index.ts creados | 5 features + utils/helpers | **Fase 3** ✅ |
| `database.ts` auto-generated | ✅ Sincronizado | Regenerar periódicamente | **Fase 3** ✅ |

---

## Fase 0: Quick Wins (Sin riesgo, alto impacto)

Estos cambios son **puramente aditivos** — crean archivos nuevos sin modificar los existentes. Se pueden hacer en cualquier momento.

### 0.1 — `src/utils/helpers/dateFormatters.ts`

**Impacto**: Elimina duplicación en 8 archivos.
**Riesgo**: Ninguno (archivo nuevo).
**Acción**: Crear el archivo con las 5 variantes de formato (ver `references/patterns.md` Pattern 6).
**Migración**: Los archivos existentes pueden importar gradualmente en vez de definir su propio `formatDate`.

### 0.2 — `src/utils/helpers/groupByDate.ts`

**Impacto**: Elimina duplicación en 3 archivos.
**Riesgo**: Ninguno.
**Acción**: Crear `toLocalDateKey()` + `groupByDate<T, S>()` genérico (ver Pattern 7).

### 0.3 — `src/utils/constants/statusStyles.ts`

**Impacto**: Centraliza estilos de status repetidos.
**Riesgo**: Ninguno.
**Acción**: Crear mapas de estilos para status de sale_products, time_off, order_type.

### 0.4 — `src/hooks/useModalState.ts`

**Impacto**: Reduce boilerplate en 10+ páginas.
**Riesgo**: Ninguno (hook nuevo, las páginas pueden adoptarlo gradualmente).
**Acción**: Crear hook genérico `useModalState<T>()` (ver Pattern 8).

### Checklist Fase 0

- [ ] Crear `src/utils/helpers/dateFormatters.ts`
- [ ] Crear `src/utils/helpers/groupByDate.ts`
- [ ] Crear `src/utils/constants/statusStyles.ts`
- [ ] Crear `src/hooks/useModalState.ts`
- [ ] Verificar build (`npm run build`)
- [ ] Crear al menos 1 página que use las nuevas utilities como prueba

---

## Fase 1: God Components (Mayor impacto, requiere cuidado)

Estos cambios modifican archivos existentes. Hacer uno a la vez, verificar después de cada uno.

### 1.1 — `horario/page.tsx` → `features/horario/`

**Estado actual**: 968 LOC con 7+ sub-componentes inline.
**Objetivo**:
```
src/features/horario/
├── components/
│   ├── WeeklyScheduleGrid.tsx    # Grid de horario semanal
│   ├── TimeOffRequestList.tsx    # Lista de solicitudes
│   ├── ExtraHoursLog.tsx         # Log de horas extra
│   ├── EmployeeBalances.tsx      # Balances de empleados
│   └── WeekNavigation.tsx        # Navegación por semana
├── services/
│   └── scheduleService.ts        # Operaciones Supabase extraídas
└── utils/
    └── scheduleHelpers.ts        # Helpers de fecha/hora del schedule
```
**Page resultante**: < 150 LOC, orquesta componentes + tabs.

**Pasos**:
1. Crear carpeta `features/horario/`
2. Extraer cada sub-componente inline a su propio archivo
3. Extraer llamadas Supabase a `scheduleService.ts`
4. Reducir `page.tsx` a orquestación
5. Verificar funcionalidad completa
6. Verificar build

### 1.2 — `SaleForm` → Service + Sub-components

**Estado actual**: 999 LOC con 4 responsabilidades.
**Objetivo**:
```
src/features/sales/
├── services/
│   └── salesService.ts           # createSale, recordTransaction, etc.
└── components/
    ├── ProductSelector.tsx        # Selección de productos
    ├── PaymentSection.tsx         # Lógica de pagos
    └── CustomerSearch.tsx         # Búsqueda de cliente por DNI
```
**SaleForm resultante**: < 300 LOC, usa service + sub-components.

### 1.3 — `RecipeForm` → Service + Sub-components

**Estado actual**: 1066 LOC.
**Objetivo**: Similar a SaleForm — extraer `recipeService.ts` y sub-componentes para selección de ingredientes y cálculo de costos.

### 1.4 — `PurchaseForm` → Service + Sub-components

**Estado actual**: 759 LOC.
**Objetivo**: Extraer `purchaseService.ts` y sub-componentes de items.

### Checklist Fase 1 (por cada god component)

- [ ] Crear carpeta en `features/`
- [ ] Extraer service layer (llamadas Supabase)
- [ ] Extraer sub-componentes (JSX + lógica local)
- [ ] Reducir archivo original a orquestación
- [ ] Verificar funcionalidad (manual)
- [ ] Verificar build (`npm run build`)
- [ ] LOC final dentro de límites

---

## Fase 2: Mejoras Incrementales

Hacer cuando se toque el archivo por otra razón.

### 2.1 — Extraer sub-componentes de `inventario/page.tsx`

**Cuándo**: La próxima vez que se modifique inventario.
**Qué hacer**: Mover tabs a componentes separados.

### 2.2 — Reemplazar `alert()` por error inline

**Cuándo**: Cada vez que se toque un form con `alert()`.
**Qué hacer**: Agregar `submitError` state + banner (ver Pattern 9).
**No hacer**: Reemplazar todos los 39 `alert()` de una vez.

### 2.3 — Extraer `formatDate` de archivos existentes

**Cuándo**: Cada vez que se toque un archivo con `formatDate` local.
**Qué hacer**: Importar de `utils/helpers/dateFormatters.ts` y eliminar definición local.

---

## Fase 3: Polish (Baja prioridad) — ✅ COMPLETADA

### 3.1 — Mejorar tipado genérico

- ✅ Eliminado `as AppRole` innecesario en `UserRoleForm/index.tsx`
- ✅ Eliminados 3× `as TabId` en `horario/page.tsx` (tipado con `satisfies`)
- ✅ 0 `any` types encontrados — codebase limpio
- ✅ 19 casts restantes son necesarios (joins Supabase, DOM events, `as const`)

### 3.2 — Regenerar `database.ts`

- ✅ Verificado sincronizado con Supabase (PostgrestVersion 12.2.3)

### 3.3 — Barrel exports

- ✅ `src/features/compras/index.ts`
- ✅ `src/features/ventas/index.ts`
- ✅ `src/features/recetas/index.ts`
- ✅ `src/features/horario/index.ts`
- ✅ `src/features/inventario/index.ts`
- ✅ `src/utils/helpers/index.ts`
- ✅ Eliminado directorio vacío `src/utils/constants/`

---

## Lo que NO Tocar (Explícito)

Estos archivos/patrones **funcionan bien** y no necesitan migración:

| Archivo/Patrón | Razón para no tocar |
|----------------|-------------------|
| `src/hooks/useCategories.ts` | Referencia, 30 LOC, perfecto |
| `src/hooks/useProducts.ts` | Mismo patrón, perfecto |
| `src/hooks/usePendingOrders.ts` | Complejo pero justificado (Realtime) |
| `src/components/forms/CategoryForm/` | Referencia, 144 LOC, perfecto |
| `src/components/forms/ProductForm/` | Limpio, funciona bien |
| `src/components/forms/IngredientForm/` | Limpio, funciona bien |
| `src/components/forms/Schedule*Form/` | Limpios, usan useState correctamente |
| `src/components/ui/*` | Todos bien, genéricos, extensibles |
| `src/components/AuthGuard.tsx` | Funciona correctamente |
| `src/components/AppShell.tsx` | Layout wrapper simple |
| `src/app/categories/page.tsx` | Referencia, 130 LOC |
| `src/app/ingredients/page.tsx` | 132 LOC, limpio |
| `src/app/recipes/page.tsx` | 133 LOC, limpio |
| `src/utils/auditLog.ts` | Fire-and-forget, 27 LOC, perfecto |
| `src/utils/saleNumber.ts` | Utility específica, funciona |
| `src/utils/purchaseNumber.ts` | Utility específica, funciona |
| `src/types/*` | Bien organizados con barrel export |
| `src/middleware.ts` | Auth redirect, funciona |

---

## Reglas de Coexistencia

Durante la migración, el código viejo y el nuevo conviven:

1. **Hooks en `src/hooks/`** conviven con hooks en `src/features/[x]/hooks/`
2. **Forms en `src/components/forms/`** conviven con components en `src/features/[x]/components/`
3. **Pages importan de ambos** — `@/hooks/` y `@/features/[x]/`
4. **No mover archivos** que no se estén migrando activamente
5. **No crear re-exports** innecesarios para "compatibilidad"
6. **Un archivo, una ubicación** — cuando se migra, se mueve; no se duplica

### Ejemplo de coexistencia

```typescript
// src/app/horario/page.tsx — DESPUÉS de Fase 1.1
"use client";

// Features migradas
import { WeeklyScheduleGrid } from "@/features/horario/components/WeeklyScheduleGrid";
import { TimeOffRequestList } from "@/features/horario/components/TimeOffRequestList";

// Hooks existentes (no migrados, funcionan bien)
import { useSchedule } from "@/hooks/useSchedule";
import { useTimeOffRequests } from "@/hooks/useTimeOffRequests";
import { useAuth } from "@/hooks/useAuth";

// Componentes UI existentes
import PageHeader from "@/components/ui/PageHeader";

// Forms existentes (no migrados)
import ScheduleTemplateForm from "@/components/forms/ScheduleTemplateForm";
```

---

## Checklist: Feature "Migrada"

Una feature se considera migrada cuando:

- [x] Tiene carpeta propia en `src/features/[nombre]/`
- [x] Service layer para todas las operaciones Supabase
- [x] Sub-componentes extraídos (ninguno > 300 LOC)
- [x] Página orquestadora < 200 LOC
- [x] Sin `alert()` — usa error state inline
- [x] Sin `formatDate` local — usa `utils/helpers/dateFormatters.ts`
- [x] Sin `createClient()` en componentes — solo en services
- [x] Build pasa sin errores
- [x] Funcionalidad verificada manualmente

---

## Reporte Final de Migración (Fases 0–3)

### Resumen

| Métrica | Antes | Después |
|---------|-------|---------|
| God components (>500 LOC) | 4 (`horario` 968, `SaleForm` 999, `RecipeForm` 1066, `PurchaseForm` 759) | 0 |
| `features/` directories | 0 | 5 (`compras`, `ventas`, `recetas`, `horario`, `inventario`) |
| Service files | 0 | 5 (`purchasesService`, `salesService`, `recipesService`, `scheduleService`, `inventoryService`) |
| Barrel exports (`index.ts`) | 0 in features | 6 (5 features + `utils/helpers`) |
| `any` types | 0 | 0 (ya estaba limpio) |
| Innecesarios `as` casts | 4 | 0 (19 necesarios mantenidos) |
| Shared helpers | 0 | 3 (`dateFormatters`, `groupByDate`, `deleteWithAudit`) |
| `database.ts` | Sincronizado | Verificado sincronizado |

### Archivos creados en `features/`

```
src/features/
├── compras/
│   ├── index.ts
│   ├── types.ts
│   ├── components/
│   │   ├── ItemSelector.tsx
│   │   └── ItemList.tsx
│   └── services/
│       └── purchasesService.ts
├── ventas/
│   ├── index.ts
│   ├── types.ts
│   ├── constants.ts
│   ├── components/
│   │   ├── PaymentSection.tsx
│   │   └── ProductSelector.tsx
│   └── services/
│       └── salesService.ts
├── recetas/
│   ├── index.ts
│   ├── types.ts
│   ├── constants.ts
│   ├── components/
│   │   ├── IngredientSelector.tsx
│   │   └── IngredientList.tsx
│   └── services/
│       └── recipesService.ts
├── horario/
│   ├── index.ts
│   ├── constants.ts
│   ├── components/
│   │   ├── ScheduleTab.tsx
│   │   ├── RequestsTab.tsx
│   │   ├── BalanceTab.tsx
│   │   ├── DesktopScheduleGrid.tsx
│   │   ├── MobileDayView.tsx
│   │   ├── SlotBadge.tsx
│   │   ├── RequestCard.tsx
│   │   ├── AdminBalanceView.tsx
│   │   ├── EmployeeBalanceView.tsx
│   │   └── LedgerList.tsx
│   └── services/
│       └── scheduleService.ts
└── inventario/
    ├── index.ts
    ├── components/
    │   ├── StockTab.tsx
    │   └── HistorialTab.tsx
    └── services/
        └── inventoryService.ts
```

### Deuda técnica restante (baja prioridad)

- **19 `as` casts necesarios**: Mayoría son `as unknown as` para joins de Supabase — legítimos hasta que Supabase mejore su generador de tipos
- **`alert()` en forms legacy**: ~39 instancias en forms no migrados — migrar cuando se toque el form
- **`formatDate` local**: Algunos archivos aún definen `formatDate` local — migrar cuando se toque el archivo
- **`useModalState` hook**: No creado (Fase 0.4 pospuesta) — boilerplate de modales es tolerable
