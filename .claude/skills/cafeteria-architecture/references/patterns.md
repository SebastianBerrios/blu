# Common Patterns — Templates Basados en Código Real de Blu

Cada patrón incluye el archivo de referencia real del proyecto y un template para código nuevo.

---

## Pattern 1: SWR Hook (Lectura)

> **Referencia**: `src/hooks/useCategories.ts` (30 LOC) — el hook más limpio del proyecto.

### Template

```typescript
// src/hooks/use[Entities].ts
import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { Entity } from "@/types";

const fetchEntities = async (): Promise<Entity[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("table_name")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching entities:", error);
    throw new Error(error.message);
  }

  return data || [];
};

export const useEntities = () => {
  const { data, error, isLoading, mutate } = useSWR<Entity[]>(
    "entities",                    // SWR key — string simple para queries sin filtros
    fetchEntities,
    {
      revalidateOnFocus: false,    // SIEMPRE estos tres
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  return { entities: data ?? [], error, isLoading, mutate };
};
```

### Variante con filtros (basada en `useSales.ts`)

```typescript
export const useEntities = (filters: EntityFilters) => {
  const { data, error, isLoading, mutate } = useSWR<Entity[]>(
    ["entities", filters],         // Array key para invalidación selectiva
    () => fetchEntities(filters),
    { revalidateOnFocus: false, revalidateOnReconnect: true, dedupingInterval: 2000 }
  );

  return { entities: data ?? [], error, isLoading, mutate };
};
```

### Variante role-aware (basada en `useSchedule.ts`, `useExtraHours.ts`)

```typescript
export const useEntities = (isAdmin: boolean, userId?: string) => {
  const { data, error, isLoading, mutate } = useSWR<Entity[]>(
    isAdmin !== undefined && userId
      ? ["entities", isAdmin, userId]  // null key mientras auth carga
      : null,
    () => fetchEntities(isAdmin, userId),
    { revalidateOnFocus: false, revalidateOnReconnect: true, dedupingInterval: 2000 }
  );

  return { entities: data ?? [], error, isLoading, mutate };
};
```

---

## Pattern 2: Form Modal (CRUD)

> **Referencia**: `src/components/forms/CategoryForm/index.tsx` (144 LOC) — el form más limpio.

### Template

```typescript
// src/components/forms/[Entity]Form/index.tsx
import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { CreateEntity, Entity } from "@/types";

interface EntityFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entity?: Entity;                // undefined = crear, defined = editar
}

export default function EntityForm({
  isOpen,
  onClose,
  onSuccess,
  entity,
}: EntityFormProps) {
  const isEditMode = !!entity;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset } = useForm<CreateEntity>();

  // Reset form cuando se abre/cierra
  useEffect(() => {
    if (isOpen) {
      reset(entity ? { name: entity.name } : { name: "" });
    }
  }, [isOpen, entity, reset]);

  // Early return si no está abierto
  if (!isOpen) return null;

  const onSubmit: SubmitHandler<CreateEntity> = async (data) => {
    setIsSubmitting(true);
    try {
      const supabase = createClient();

      if (isEditMode) {
        const { error } = await supabase
          .from("table")
          .update(data)
          .eq("id", entity.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("table").insert(data);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="text-xl font-semibold text-slate-900">
            {isEditMode ? "Editar [Entidad]" : "Agregar [Entidad]"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* ... campos ... */}

          {/* Botones — siempre al final */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 min-h-[44px] border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : isEditMode ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Variante con service layer (para código NUEVO)

```typescript
// En el form, reemplazar llamada directa:
// ❌ const supabase = createClient();
// ❌ await supabase.from("table").insert(data);

// ✅ import { createEntity, updateEntity } from "@/features/[nombre]/services/entityService";
const onSubmit: SubmitHandler<CreateEntity> = async (data) => {
  setIsSubmitting(true);
  setSubmitError(null);
  try {
    if (isEditMode) {
      await updateEntity(entity.id, data);
    } else {
      await createEntity(data);
    }
    onSuccess();
    onClose();
  } catch (error) {
    setSubmitError(error instanceof Error ? error.message : "Error desconocido");
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## Pattern 3: CRUD Page

> **Referencia**: `src/app/categories/page.tsx` (130 LOC) — la página más limpia.

### Template

```typescript
// src/app/[entity]/page.tsx
"use client";

import { useState } from "react";
import { IconName, SquarePen, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useEntities } from "@/hooks/useEntities";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/utils/auditLog";
import type { Entity } from "@/types";
import EntityForm from "@/components/forms/EntityForm";
import DataTable from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import FAB from "@/components/ui/FAB";

export default function Entities() {
  const { entities, error, isLoading, mutate } = useEntities();
  const { isAdmin, user, profile } = useAuth();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | undefined>();

  const handleCreate = () => {
    setSelectedEntity(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (entity: Entity) => {
    setSelectedEntity(entity);
    setIsModalOpen(true);
  };

  const handleDelete = async (entity: Entity) => {
    const supabase = createClient();
    const { error } = await supabase.from("table").delete().eq("id", entity.id);
    if (!error) {
      logAudit({
        userId: user?.id ?? null,
        userName: profile?.full_name ?? null,
        action: "eliminar",
        targetTable: "table",
        targetId: entity.id,
        targetDescription: `Entidad: ${entity.name}`,
      });
    }
    mutate();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEntity(undefined);
  };

  return (
    <>
      <section className="h-full flex flex-col bg-slate-50">
        <PageHeader
          title="Entidades"
          subtitle="Gestiona las entidades"
          icon={<IconName className="w-6 h-6 text-primary-700" />}
          action={isAdmin ? (
            <Button variant="primary" icon={true} onClick={handleCreate}>
              Agregar entidad
            </Button>
          ) : undefined}
        />

        <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">Error al cargar: {error.message}</p>
            </div>
          )}
          <DataTable<Entity>
            title="Lista"
            columns={isAdmin ? ["N°", "Nombre", "Acciones"] : ["N°", "Nombre"]}
            dataKeys={["id", "name"]}
            data={entities}
            isLoading={isLoading}
            onEdit={isAdmin ? handleEdit : undefined}
            onDelete={isAdmin ? handleDelete : undefined}
            renderCard={(item, onEditFn, onDeleteFn) => (
              <div className="flex items-center justify-between px-4 py-3">
                {/* Mobile card content */}
              </div>
            )}
          />
        </div>
      </section>

      {isAdmin && <FAB onClick={handleCreate} label="Agregar entidad" />}

      {isAdmin && (
        <EntityForm
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={() => mutate()}
          entity={selectedEntity}
        />
      )}
    </>
  );
}
```

---

## Pattern 4: Service Layer (para código NUEVO)

> Template extraído del patrón de `SaleForm` — lo que debería ser un service.

### Template

```typescript
// src/features/[nombre]/services/entityService.ts
import { createClient } from "@/utils/supabase/client";
import type { Entity, CreateEntity } from "@/types";

export async function fetchEntities(): Promise<Entity[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("table")
    .select("*")
    .order("name");

  if (error) throw new Error(`Error al cargar entidades: ${error.message}`);
  return data ?? [];
}

export async function createEntity(input: CreateEntity): Promise<Entity> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("table")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Error al crear: ${error.message}`);
  return data;
}

export async function updateEntity(id: number, input: Partial<CreateEntity>): Promise<Entity> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("table")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Error al actualizar: ${error.message}`);
  return data;
}

export async function deleteEntity(id: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("table").delete().eq("id", id);
  if (error) throw new Error(`Error al eliminar: ${error.message}`);
}
```

---

## Pattern 5: Delete + Audit Helper

> Extraído del patrón repetido en 10+ páginas.

### Template

```typescript
// src/utils/helpers/deleteWithAudit.ts
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import type { AuditAction, AuditTargetTable } from "@/types/auditLog";

interface DeleteWithAuditParams {
  table: string;
  id: number;
  userId: string | null;
  userName: string | null;
  auditTable: AuditTargetTable;
  description: string;
}

export async function deleteWithAudit({
  table,
  id,
  userId,
  userName,
  auditTable,
  description,
}: DeleteWithAuditParams): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from(table).delete().eq("id", id);

  if (!error) {
    logAudit({
      userId,
      userName,
      action: "eliminar",
      targetTable: auditTable,
      targetId: id,
      targetDescription: description,
    });
    return true;
  }

  return false;
}
```

---

## Pattern 6: Date Formatters (Shared Utility)

> Extraído de las 8 implementaciones duplicadas de `formatDate()` en el proyecto.

### Template

```typescript
// src/utils/helpers/dateFormatters.ts

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * "3 de abril de 2026" — Usado en sales, compras, auditoria
 */
export function formatDateLong(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${parseInt(day)} de ${MONTHS_ES[parseInt(month) - 1]} de ${year}`;
}

/**
 * "03/04/26, 14:30" — Usado en inventario
 */
export function formatDateTimeShort(isoStr: string): string {
  return new Date(isoStr).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * "3 abr 2026" — Usado en users
 */
export function formatDateMedium(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * "lun 3 de abril" — Usado en horario
 */
export function formatDateWithWeekday(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("es-PE", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

/**
 * "03, abr" — Usado en estadísticas (gráficos)
 */
export function formatDateChart(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
  });
}
```

---

## Pattern 7: Generic groupByDate

> Extraído de `useSales.ts`, `usePurchases.ts`, `auditoria/page.tsx`.

### Template

```typescript
// src/utils/helpers/groupByDate.ts

/**
 * Convierte ISO date a key local YYYY-MM-DD (sin problemas de timezone).
 * Basado en toLocalDateKey() de useSales.ts
 */
export function toLocalDateKey(isoStr: string): string {
  const d = new Date(isoStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Agrupa items por fecha, ordenados por fecha descendente.
 *
 * @param items - Array de items con campo de fecha
 * @param getDate - Función para obtener la fecha ISO de cada item
 * @param getSummary - Opcional: función para calcular un resumen por grupo (e.g., dailyTotal)
 */
export function groupByDate<T, S = undefined>(
  items: T[],
  getDate: (item: T) => string,
  getSummary?: (groupItems: T[]) => S
): Array<{ date: string; items: T[]; summary: S }> {
  const map = new Map<string, T[]>();

  for (const item of items) {
    const key = toLocalDateKey(getDate(item));
    const group = map.get(key);
    if (group) {
      group.push(item);
    } else {
      map.set(key, [item]);
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, groupItems]) => ({
      date,
      items: groupItems,
      summary: getSummary ? getSummary(groupItems) : (undefined as S),
    }));
}
```

---

## Pattern 8: Modal State Hook

> Extraído del patrón repetido en 10+ páginas CRUD.

### Template

```typescript
// src/hooks/useModalState.ts
import { useState, useCallback } from "react";

export function useModalState<T>() {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<T | undefined>();

  const openCreate = useCallback(() => {
    setSelected(undefined);
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setSelected(item);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSelected(undefined);
  }, []);

  return { isOpen, selected, openCreate, openEdit, close };
}
```

### Uso en página

```typescript
// Antes: 8 líneas de useState + handlers
// Después: 1 línea
const modal = useModalState<Category>();

// En JSX
<Button onClick={modal.openCreate}>Agregar</Button>
<DataTable onEdit={modal.openEdit} />
<CategoryForm
  isOpen={modal.isOpen}
  onClose={modal.close}
  onSuccess={() => mutate()}
  category={modal.selected}
/>
```

---

## Pattern 9: Error Handling en Forms (Código Nuevo)

> Reemplaza el patrón actual de `alert()` con error inline.

### Template

```typescript
// En el form component
const [submitError, setSubmitError] = useState<string | null>(null);

const onSubmit = async (data: FormData) => {
  setIsSubmitting(true);
  setSubmitError(null);

  try {
    // Llamar service en vez de createClient() directo
    await entityService.create(data);
    onSuccess();
    onClose();
  } catch (error) {
    setSubmitError(
      error instanceof Error ? error.message : "Ocurrió un error inesperado"
    );
  } finally {
    setIsSubmitting(false);
  }
};

// En el JSX, antes de los botones:
{submitError && (
  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-sm text-red-700">{submitError}</p>
  </div>
)}
```

---

## Pattern 10: Constants (Shared)

> Extraer constantes repetidas a archivos dedicados.

### Status Styles

```typescript
// src/utils/constants/statusStyles.ts

export const SALE_PRODUCT_STATUS_STYLES = {
  Pendiente: "bg-amber-100 text-amber-700",
  Entregado: "bg-green-100 text-green-700",
} as const;

export const TIME_OFF_STATUS_STYLES = {
  pendiente: "bg-amber-100 text-amber-700",
  aprobado: "bg-green-100 text-green-700",
  rechazado: "bg-red-100 text-red-700",
} as const;

export const ORDER_TYPE_STYLES = {
  Mesa: "bg-blue-100 text-blue-700",
  "Para llevar": "bg-purple-100 text-purple-700",
  Delivery: "bg-orange-100 text-orange-700",
} as const;
```

### Payment Methods

```typescript
// src/utils/constants/paymentMethods.ts

export const PAYMENT_METHODS = ["Efectivo", "Plin", "Efectivo + Plin"] as const;

export const PAYMENT_METHOD_ICONS = {
  Efectivo: "Banknote",
  Plin: "Smartphone",
  "Efectivo + Plin": "Wallet",
} as const;
```

---

## Feature Development Workflow (para código NUEVO)

Al crear una feature nueva, seguir este orden:

### Step 1: Types (`types/` o `features/[nombre]/types/`)

Definir base type, extended type, create type, y filters.

### Step 2: Service (`features/[nombre]/services/`)

CRUD operations contra Supabase. Solo este layer conoce `createClient()`.

### Step 3: Hook (`hooks/` o `features/[nombre]/hooks/`)

SWR hook con config estándar. Retorna `{ data: T[], error, isLoading, mutate }`.

### Step 4: Components (`components/` o `features/[nombre]/components/`)

**Antes de escribir código de UI, consultar la skill `frontend-design`.**

Form modal con la interfaz estándar `{ isOpen, onClose, onSuccess, item? }`.

### Step 5: Page (`app/[nombre]/page.tsx`)

Orquesta hook + components. Objetivo < 200 LOC.
