# SOLID Principles — Ejemplos Reales del Proyecto Blu

Cada principio se ilustra con código real del proyecto, mostrando lo que funciona bien y lo que necesita mejorar.

---

## SRP — Single Responsibility Principle

> Cada archivo hace una sola cosa. Si tiene dos razones para cambiar, se divide.

### Ejemplo bueno: `auditLog.ts` (27 LOC)

Un solo trabajo: registrar acciones en la tabla `audit_logs`, fire-and-forget.

```typescript
// src/utils/auditLog.ts — REFERENCIA
export async function logAudit(params: {
  userId: string | null;
  userName: string | null;
  action: AuditAction;
  targetTable: AuditTargetTable;
  targetId?: string | number;
  targetDescription?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from("audit_logs").insert({ /* ... */ });
  } catch {
    // Fire-and-forget: never block the main operation
  }
}
```

**Por qué es bueno**: Una función, un propósito, nunca lanza errores. Cambiar el formato de audit no afecta nada más.

### Ejemplo bueno: `useCategories.ts` (30 LOC)

Un solo trabajo: fetch + cache de categorías via SWR.

```typescript
// src/hooks/useCategories.ts — REFERENCIA
const fetchCategories = async () => {
  const supabase = createClient();
  const { data, error } = await supabase.from("categories").select();
  if (error) throw new Error(error.message);
  return data || [];
};

export const useCategories = () => {
  const { data, error, isLoading, mutate } = useSWR<Category[]>(
    "categories",
    fetchCategories,
    { revalidateOnFocus: false, revalidateOnReconnect: true, dedupingInterval: 2000 }
  );
  return { categories: data ?? [], error, isLoading, mutate };
};
```

### Ejemplo malo: `SaleForm/index.tsx` (999 LOC)

Cuatro responsabilidades mezcladas en un solo archivo:
1. **Lógica de formulario** — gestión de productos, cantidades, precios
2. **Lógica de pagos** — cálculo de montos, cambio, validación de Plin
3. **Lógica de clientes** — búsqueda por DNI, creación
4. **Llamadas a Supabase** — inserts directos a `sales`, `sale_products`, `record_transaction`

**Corrección propuesta**: Extraer `salesService.ts` con las operaciones de Supabase, un hook `useSaleForm` para la lógica de negocio, y sub-componentes para las secciones del formulario.

### Ejemplo malo: `horario/page.tsx` (968 LOC)

Siete sub-componentes inline dentro de una sola página:
- Grid de horario semanal
- Lista de solicitudes de tiempo libre
- Log de horas extra
- Controles de admin
- Balances de empleados
- Filtros por semana

**Corrección propuesta**: Extraer a `features/horario/` con componentes separados.

---

## OCP — Open/Closed Principle

> Abierto para extensión, cerrado para modificación.

### Ejemplo bueno: `DataTable<T>`

El componente genérico se extiende via props sin modificar su código:

```typescript
// Se usa en categories con columnas simples
<DataTable<Category>
  columns={["N°", "Categorías", "Acciones"]}
  dataKeys={["id", "name"]}
  data={categories}
  onEdit={handleEdit}
  onDelete={handleDelete}
  renderCard={(item, onEditFn, onDeleteFn) => (
    <div>...</div>
  )}
/>

// Se usa en products con columnas diferentes
<DataTable<Product>
  columns={["N°", "Producto", "Categoría", "Precio", "Acciones"]}
  dataKeys={["id", "name", "category_name", "suggested_price"]}
  data={products}
  canEdit={(item) => isAdmin}
  renderCard={(item) => <ProductCard product={item} />}
/>
```

Cada página extiende el comportamiento de DataTable sin tocarlo.

### Ejemplo bueno: Form interface consistente

Todos los forms siguen `{ isOpen, onClose, onSuccess, item? }`, lo que permite que las páginas los usen de forma intercambiable sin conocer su implementación interna.

### Ejemplo malo: Constantes hardcodeadas en páginas

Los estilos de status (`"Pendiente"`, `"Entregado"`) se definen inline en cada página que los usa, en lugar de extraerse a un mapa extensible:

```typescript
// ❌ Repetido en sales/page.tsx, pedidos/page.tsx
const statusColors = {
  "Pendiente": "bg-amber-100 text-amber-700",
  "Entregado": "bg-green-100 text-green-700",
};

// ✅ Debería estar en utils/constants/statusStyles.ts
export const SALE_PRODUCT_STATUS_STYLES = { /* ... */ } as const;
```

---

## LSP — Liskov Substitution Principle

> Los subtipos deben ser sustituibles por sus tipos base.

### Ejemplo bueno: Modal forms interface

Todos los forms comparten la misma interfaz base:

```typescript
interface FormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item?: Entity;  // undefined = create, defined = edit
}
```

`CategoryForm`, `ProductForm`, `IngredientForm` son todos intercambiables desde la perspectiva de la página padre. La página no necesita saber cuál form es — solo le pasa `isOpen`, `onClose`, `onSuccess`, y opcionalmente un `item`.

### Excepción documentada: `TimeOffReviewForm`

Este form NO sigue la interfaz estándar:
- Usa `request` en vez de `item`
- Tiene botones "Aprobar" / "Rechazar" en vez de "Guardar" / "Actualizar"
- Acepta `onApprove` y `onReject` callbacks en vez de `onSuccess`

**Esto es aceptable** porque su propósito es fundamentalmente diferente (revisar, no crear/editar). Está documentado como excepción.

---

## ISP — Interface Segregation Principle

> No forzar a depender de interfaces que no se usan.

### Ejemplo bueno: Tipos segregados en `sales.ts`

```typescript
// src/types/sales.ts — REFERENCIA
export type Sale = Tables<"sales">;                    // Base DB type
export type SaleProduct = Tables<"sale_products">;     // Related table
export type PaymentMethod = "Efectivo" | "Plin" | "Efectivo + Plin";

export interface SaleWithProducts extends Sale {        // Extended for page display
  sale_products: SaleProductWithDetails[];
  creator_name?: string | null;
}

export interface CreateSale {                           // Only creation fields
  orderType: string;
  products: { productId: number; quantity: number; unitPrice: number; }[];
}

export interface SalesFilters {                         // Only filter fields
  startDate?: string;
  endDate?: string;
  orderType?: string;
}
```

Cada contexto usa solo lo que necesita:
- La página de ventas usa `SaleWithProducts`
- El form usa `CreateSale`
- El hook usa `SalesFilters`
- Pedidos usa `SaleProductWithDetails` + `SaleProductStatus`

### Patrón de tipos en el proyecto

```typescript
// 1. Base type (wraps auto-generated Supabase type)
export type Entity = Tables<"table_name">;

// 2. Extended type (for display with joins)
export interface EntityWithRelations extends Entity {
  related_items: RelatedItem[];
  computed_field?: string;
}

// 3. Create type (only writeable fields)
export interface CreateEntity {
  required_field: string;
  optional_field?: number;
}

// 4. Filter type (for hook parameters)
export interface EntityFilters {
  startDate?: string;
  endDate?: string;
}

// 5. Literal unions (business domain values)
export type EntityStatus = "Pendiente" | "Completado";
```

---

## DIP — Dependency Inversion Principle

> Depender de abstracciones, no de implementaciones.

### Ejemplo bueno (lectura): Hooks como abstracción

Las páginas dependen de hooks, nunca de Supabase directamente para **leer** datos:

```
categories/page.tsx → useCategories() → Supabase
```

Si se cambia Supabase por otra DB, solo cambia el fetcher dentro del hook. La página no se entera.

### Ejemplo malo (escritura): Pages llaman `createClient()` directo

Para operaciones de escritura (delete, principalmente), las páginas acceden a Supabase directamente:

```typescript
// ❌ categories/page.tsx — patrón actual en 10+ páginas
const handleDelete = async (category: Category) => {
  const supabase = createClient();
  const { error } = await supabase.from("categories").delete().eq("id", category.id);
  if (!error) logAudit({ /* ... */ });
  mutate();
};
```

**Corrección propuesta** para código nuevo:

```typescript
// ✅ Service layer
// features/[nombre]/services/entityService.ts
export async function deleteEntity(id: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("table").delete().eq("id", id);
  if (error) throw error;
}

// ✅ Page usa el service
const handleDelete = async (entity: Entity) => {
  try {
    await deleteEntity(entity.id);
    logAudit({ /* ... */ });
    mutate();
  } catch (error) {
    // Show error in UI, not alert()
  }
};
```

### Resumen DIP en el proyecto

| Operación | Estado actual | Estado objetivo |
|-----------|--------------|-----------------|
| Lectura (fetch) | ✅ Via hooks SWR | Mantener |
| Escritura (create/update) | ❌ `createClient()` directo en forms | Via services |
| Eliminación (delete) | ❌ `createClient()` directo en pages | Via services o helper |
| Audit logging | ✅ Via `logAudit()` | Mantener |
| RPCs | ✅ Via funciones específicas | Mantener |

---

## DRY — Don't Repeat Yourself (Rule of Three)

> Extraer a shared solo cuando la duplicación aparece en 3+ lugares.

### Duplicaciones conocidas que necesitan extracción

**1. `formatDate()` — 8 implementaciones diferentes**

```typescript
// sales/page.tsx — formato: "3 de abril de 2026"
// compras/page.tsx — formato idéntico al de sales
// inventario/page.tsx — formato: "03/04/26, 14:30" (toLocaleString es-PE)
// users/page.tsx — formato: "3 abr 2026"
// auditoria/page.tsx — formato: "3 de abril de 2026" (via Date object)
// estadisticas/page.tsx — formato: "03, abr" (short)
// horario/page.tsx — formato: "lun 3 de abril"
// TimeOffReviewForm — formato: "lunes, 3 de abril"
```

**Solución**: `utils/helpers/dateFormatters.ts` con variantes nombradas.

**2. `groupByDate()` — 3 implementaciones**

- `useSales.ts` — con `dailyTotal`, sorted desc
- `usePurchases.ts` — reutiliza `toLocalDateKey` de sales
- `auditoria/page.tsx` — implementación inline sin totales

**Solución**: `utils/helpers/groupByDate.ts` genérico.

**3. Modal state management — Repetido en 10+ páginas**

```typescript
// Patrón repetido en CADA página CRUD
const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
const [selectedItem, setSelectedItem] = useState<Entity | undefined>();

const handleCreate = () => { setSelectedItem(undefined); setIsModalOpen(true); };
const handleEdit = (item: Entity) => { setSelectedItem(item); setIsModalOpen(true); };
const handleCloseModal = () => { setIsModalOpen(false); setSelectedItem(undefined); };
```

**Solución**: `hooks/useModalState.ts` que encapsule el patrón.

---

## Error Handling Pattern

### Estado actual (inconsistente)

| Método | Usado en | Problema |
|--------|---------|----------|
| `alert()` | 39 llamadas en forms | Bloquea UI, no profesional |
| `console.error()` | Forms simples (CategoryForm) | Silencioso, usuario no ve nada |
| Error banner | Páginas (via SWR error) | ✅ Correcto |

### Patrón objetivo para código nuevo

```
Service: throw Error  →  Hook: catch + expose error state  →  Component: render error UI
```

```typescript
// Service throws
export async function createSale(data: CreateSale): Promise<Sale> {
  const { data: sale, error } = await supabase.from("sales").insert(data);
  if (error) throw new Error(`Error al crear venta: ${error.message}`);
  return sale;
}

// Form catches and shows inline error
const [submitError, setSubmitError] = useState<string | null>(null);

const onSubmit = async (data: CreateSale) => {
  setSubmitError(null);
  try {
    await createSale(data);
    onSuccess();
    onClose();
  } catch (error) {
    setSubmitError(error instanceof Error ? error.message : "Error desconocido");
  }
};

// In JSX
{submitError && (
  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
    {submitError}
  </div>
)}
```
