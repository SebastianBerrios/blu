# External Providers — DIP estricto (referencia LATENTE)

> **Cuándo aplica**: SOLO al integrar un servicio de terceros **real** (pasarela de
> pago como Culqi/Stripe/MercadoPago, email, push, SMS, storage no-Supabase, IA/LLM).
> **Hoy NO aplica**: POS, Plin y Rappi en Blu son **modelos de cálculo** (porcentajes
> de comisión aplicados en TypeScript), no integraciones con APIs externas. Mientras
> no haya un `fetch` a una API de tercero ni un SDK de proveedor instalado, esta
> referencia queda dormida. Backporteada desde el sistema de arquitectura reutilizable.

Ningún proveedor de terceros se llama directo desde un componente, hook o página.
Cada uno vive detrás de **una interfaz** + **un factory**. Cambiar de proveedor =
editar el factory, nada más. Es el mismo principio de capas de `cafeteria-architecture`
(`types → services → ...`), aplicado a integraciones externas: Supabase nativo NO se
abstrae con esto (es el núcleo, se consume vía services); esto es para todo lo *demás*.

## El patrón (3 piezas)

### 1. La interfaz — qué necesita tu app, no qué ofrece el proveedor

```typescript
// src/shared/lib/<concern>/<concern>.types.ts   (o utils/lib/ según convención del repo)
export interface PaymentGateway {
  charge(amount: number, token: string): Promise<ChargeResult>;
  refund(chargeId: string): Promise<void>;
}
```

La interfaz se diseña desde las necesidades de TU dominio. No copies la forma de
la API del proveedor.

### 2. La implementación — adapta el proveedor a la interfaz

```typescript
// src/shared/lib/<concern>/<provider>.<concern>.ts
export class CulqiGateway implements PaymentGateway {
  constructor(private secretKey: string) {}

  async charge(amount: number, token: string): Promise<ChargeResult> {
    const res = await fetch("https://api.culqi.com/v2/charges", { /* ... */ });
    if (!res.ok) throw new Error(`Culqi error: ${res.status}`);
    // mapea la respuesta del proveedor a lo que TU app espera
    return mapToChargeResult(await res.json());
  }
  // ...
}
```

Toda la traducción "forma del proveedor → forma de tu app" ocurre AQUÍ y solo aquí.

### 3. El factory — el único punto que sabe qué proveedor se usa

```typescript
// src/shared/lib/<concern>/index.ts
import type { PaymentGateway } from "./payment.types";
import { CulqiGateway } from "./culqi.payment";

export function getPaymentGateway(): PaymentGateway {
  return new CulqiGateway(process.env.CULQI_SECRET_KEY!);
}
```

Cambiar de proveedor mañana = nueva clase `XGateway implements PaymentGateway` +
**una línea** en el factory. Cero cambios en services, hooks o componentes.

## Server-only vs cliente

Si un proveedor necesita una credencial secreta (service account, API key privada),
su implementación y su factory llevan `import 'server-only'` y se consumen desde un
Route Handler (`app/api/*`), nunca desde un client component. En Blu las páginas son
`"use client"`, así que cualquier secreto de proveedor vive obligatoriamente en
`app/api/*` o en un service server-only.

## Regla de oro

Si te encuentras escribiendo `fetch('https://api.proveedor.com/...')` fuera de una
clase que implementa una interfaz, párate. Va detrás de interfaz + factory.

## Interacción con la seguridad financiera de Blu

Una pasarela de pago real **no reemplaza** `record_transaction`: el cobro externo
ocurre vía el gateway, pero el asiento contable en `accounts`/`transactions` sigue
yendo por la RPC `record_transaction` (ver `CLAUDE.md` y el agent `security-auditor`).
El gateway entrega el dinero; la RPC lo registra.
