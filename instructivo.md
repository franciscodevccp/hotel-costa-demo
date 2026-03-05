# Instructivo — Sincronización Bidireccional MiHostal ↔ MotoPress
**Cuando se crea una reserva en MiHostal → se bloquean las fechas en la web del hotel**

---

## ¿Qué hace esta sincronización?

```
DIRECCIÓN 1 (ya implementado):
Web del hotel → WordPress/MotoPress → MiHostal
(reservas de la web se importan al sistema)

DIRECCIÓN 2 (este instructivo):
MiHostal → WordPress/MotoPress → Web del hotel
(reservas del sistema bloquean fechas en la web)
```

El resultado es que nunca habrá dos reservas para la misma habitación en la misma fecha, sin importar desde dónde se hizo la reserva.

---

## PASO 1 — Crear el servicio de escritura hacia MotoPress

Crear el archivo `/lib/motopress-push.ts`:

```typescript
// lib/motopress-push.ts

const MOTOPRESS_URL = process.env.MOTOPRESS_URL!;
const CONSUMER_KEY = process.env.MOTOPRESS_CONSUMER_KEY!;
const CONSUMER_SECRET = process.env.MOTOPRESS_CONSUMER_SECRET!;

const authHeader = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");

interface PushBookingParams {
  accommodationExternalId: string; // ID de la habitación en WordPress
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children?: number;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone?: string;
  note?: string;
}

// Crear una reserva en MotoPress para bloquear las fechas
export async function pushBookingToMotopress(params: PushBookingParams): Promise<string | null> {
  try {
    const body = {
      reserved_accommodations: [
        {
          accommodation: parseInt(params.accommodationExternalId),
          adults: params.adults,
          children: params.children ?? 0,
        },
      ],
      check_in_date:  params.checkIn.toISOString().split("T")[0],
      check_out_date: params.checkOut.toISOString().split("T")[0],
      status: "confirmed",
      note: params.note ?? "Reserva creada desde MiHostal",
      customer: {
        first_name: params.guestFirstName,
        last_name:  params.guestLastName,
        email:      params.guestEmail,
        phone:      params.guestPhone ?? "",
      },
    };

    const response = await fetch(`${MOTOPRESS_URL}/wp-json/mphb/v1/bookings`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Error al crear reserva en MotoPress:", error);
      return null;
    }

    const data = await response.json();
    return String(data.id); // Retorna el ID de la reserva en MotoPress

  } catch (error) {
    console.error("Error de conexión con MotoPress:", error);
    return null;
  }
}

// Cancelar una reserva en MotoPress (liberar las fechas)
export async function cancelBookingInMotopress(motopressBookingId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${MOTOPRESS_URL}/wp-json/mphb/v1/bookings/${motopressBookingId}`,
      {
        method: "POST", // MotoPress usa POST con _method para updates
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      }
    );

    return response.ok;

  } catch (error) {
    console.error("Error al cancelar reserva en MotoPress:", error);
    return false;
  }
}
```

---

## PASO 2 — Actualizar el schema de Prisma

Agregar el campo `motopressId` en el modelo Booking para guardar el ID de la reserva creada en WordPress:

```prisma
// schema.prisma
model Booking {
  // ... campos existentes ...

  externalId      String?   @unique  // ID cuando viene DE MotoPress
  externalSource  String?            // "motopress"
  motopressId     String?            // ID cuando fue ENVIADA a MotoPress
  syncedAt        DateTime?
}
```

Correr la migración:

```bash
pnpm prisma migrate dev --name add_motopress_push
```

---

## PASO 3 — Integrar el push en la creación de reservas

### Si usas un API Route (`/api/bookings/route.ts`):

```typescript
// app/api/bookings/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { pushBookingToMotopress } from "@/lib/motopress-push";

export async function POST(request: Request) {
  const body = await request.json();

  // 1. Verificar disponibilidad en MiHostal
  const conflict = await prisma.booking.findFirst({
    where: {
      roomId: body.roomId,
      status: { notIn: ["cancelled"] },
      AND: [
        { checkIn:  { lt: new Date(body.checkOut) } },
        { checkOut: { gt: new Date(body.checkIn)  } },
      ],
    },
  });

  if (conflict) {
    return NextResponse.json(
      { error: "La habitación no está disponible en esas fechas" },
      { status: 409 }
    );
  }

  // 2. Crear la reserva en MiHostal
  const booking = await prisma.booking.create({
    data: {
      roomId:    body.roomId,
      guestId:   body.guestId,
      checkIn:   new Date(body.checkIn),
      checkOut:  new Date(body.checkOut),
      adults:    body.adults,
      children:  body.children ?? 0,
      status:    "confirmed",
      totalPrice: body.totalPrice,
      notes:     body.notes ?? null,
    },
    include: {
      room:  true,
      guest: true,
    },
  });

  // 3. Enviar la reserva a MotoPress para bloquear fechas en la web
  if (booking.room?.externalId) {
    const motopressId = await pushBookingToMotopress({
      accommodationExternalId: booking.room.externalId,
      checkIn:        booking.checkIn,
      checkOut:       booking.checkOut,
      adults:         booking.adults,
      children:       booking.children,
      guestFirstName: booking.guest.firstName,
      guestLastName:  booking.guest.lastName,
      guestEmail:     booking.guest.email,
      guestPhone:     booking.guest.phone ?? undefined,
      note:           booking.notes ?? undefined,
    });

    // 4. Guardar el ID de MotoPress en la reserva
    if (motopressId) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { motopressId, syncedAt: new Date() },
      });
    }
  }

  return NextResponse.json(booking, { status: 201 });
}
```

### Si usas una Server Action:

```typescript
// actions/bookings.ts
"use server";

import prisma from "@/lib/prisma";
import { pushBookingToMotopress } from "@/lib/motopress-push";
import { revalidatePath } from "next/cache";

export async function createBooking(data: {
  roomId: number;
  guestId: number;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children?: number;
  totalPrice: number;
  notes?: string;
}) {
  // 1. Verificar disponibilidad
  const conflict = await prisma.booking.findFirst({
    where: {
      roomId: data.roomId,
      status: { notIn: ["cancelled"] },
      AND: [
        { checkIn:  { lt: data.checkOut } },
        { checkOut: { gt: data.checkIn  } },
      ],
    },
  });

  if (conflict) {
    throw new Error("La habitación no está disponible en esas fechas");
  }

  // 2. Crear en MiHostal
  const booking = await prisma.booking.create({
    data: { ...data, status: "confirmed" },
    include: { room: true, guest: true },
  });

  // 3. Enviar a MotoPress
  if (booking.room?.externalId) {
    const motopressId = await pushBookingToMotopress({
      accommodationExternalId: booking.room.externalId,
      checkIn:        booking.checkIn,
      checkOut:       booking.checkOut,
      adults:         booking.adults,
      children:       booking.children,
      guestFirstName: booking.guest.firstName,
      guestLastName:  booking.guest.lastName,
      guestEmail:     booking.guest.email,
    });

    if (motopressId) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { motopressId, syncedAt: new Date() },
      });
    }
  }

  revalidatePath("/reservas");
  return booking;
}
```

---

## PASO 4 — Manejar cancelaciones

Cuando se cancela una reserva en MiHostal, hay que liberarla también en MotoPress:

```typescript
// En tu API route o Server Action de cancelación
import { cancelBookingInMotopress } from "@/lib/motopress-push";

export async function cancelBooking(bookingId: number) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) throw new Error("Reserva no encontrada");

  // 1. Cancelar en MiHostal
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "cancelled" },
  });

  // 2. Cancelar en MotoPress si tiene ID externo
  if (booking.motopressId) {
    await cancelBookingInMotopress(booking.motopressId);
  }

  revalidatePath("/reservas");
}
```

---

## PASO 5 — Evitar bucles infinitos

El problema: cuando MiHostal crea una reserva en MotoPress, el cron de sincronización la va a querer importar de vuelta, creando un duplicado.

La solución ya está cubierta porque en el servicio de sincronización (`motopress-sync.ts`) verificamos el `externalId` antes de crear:

```typescript
// En motopress-sync.ts — esto ya evita el duplicado
const externalId = `motopress_${mpBooking.id}`;
const existing = await prisma.booking.findUnique({
  where: { externalId },
});
if (existing) continue; // Ya existe, no crear duplicado
```

Pero hay que agregar una verificación extra: cuando MiHostal crea la reserva en MotoPress y guarda el `motopressId`, ese mismo ID se usará como `externalId` si alguna vez llega en la sincronización:

```typescript
// En motopress-sync.ts, mejorar la verificación
const externalId = `motopress_${mpBooking.id}`;

// Verificar también por motopressId para evitar duplicados
const existing = await prisma.booking.findFirst({
  where: {
    OR: [
      { externalId },
      { motopressId: String(mpBooking.id) },
    ],
  },
});

if (existing) continue;
```

---

## PASO 6 — Desplegar los cambios

```bash
cd /var/www/mihotel

git pull origin main
pnpm install
pnpm prisma migrate deploy
pnpm build
pm2 restart mihotel
```

**Para hotel-costa-demo en el VPS** (mismo flujo, nombre de app puede ser `hotel-costa`):

```bash
cd /var/www/hotel-costa-demo
git pull
pnpm install
pnpm prisma migrate deploy
pnpm build                    # obligatorio: sin esto, next start falla con "Could not find a production build"
npx prisma db seed            # actualiza Room.externalId con IDs de unidad de MotoPress (para que el push funcione)
pm2 restart all
```

En el `.env` del servidor debe estar `NEXTAUTH_URL=https://sistema.hoteldelacosta.cl`. Si Auth.js sigue mostrando "UntrustedHost", añadir:

```env
AUTH_TRUST_HOST=true
```

---

## PASO 7 — Probar la integración completa

### Prueba 1: Crear reserva desde MiHostal
1. Ir al panel de MiHostal
2. Crear una reserva nueva para cualquier habitación
3. Ir al WordPress del hotel → Alojamiento → Reservas
4. Verificar que aparece la reserva recién creada
5. Verificar que esas fechas ya no están disponibles en el calendario de la web

### Prueba 2: Crear reserva desde la web
1. Ir a la página web del hotel
2. Intentar reservar una habitación en fechas ya ocupadas en MiHostal
3. Verificar que el calendario las muestra como no disponibles
4. Crear una reserva en fechas libres
5. Esperar máximo 5 minutos (o presionar el botón de sync manual)
6. Verificar que aparece en MiHostal

### Prueba 3: Cancelar desde MiHostal
1. Cancelar una reserva en MiHostal
2. Ir al WordPress → Reservas
3. Verificar que quedó cancelada también en MotoPress
4. Verificar que esas fechas volvieron a estar disponibles en la web

---

## Resumen del flujo completo

```
FLUJO 1 — Reserva desde la web:
Cliente en web → MotoPress registra → Cron cada 5min → MiHostal importa
(sin duplicado porque verifica motopressId)

FLUJO 2 — Reserva desde MiHostal:
Recepcionista en MiHostal → MiHostal crea → Push a MotoPress → Web bloquea fechas
(sin duplicado porque verifica motopressId en el sync inverso)

FLUJO 3 — Cancelación:
Cancelar en MiHostal → Cancelar en MotoPress → Fechas liberadas en la web
```

---

## Resumen de archivos a crear o modificar

| Archivo | Acción |
|---|---|
| `lib/motopress-push.ts` | Crear — servicio de escritura hacia MotoPress |
| `schema.prisma` | Agregar campo `motopressId` al modelo Booking |
| `app/api/bookings/route.ts` | Modificar POST para incluir push a MotoPress |
| `lib/motopress-sync.ts` | Modificar verificación para evitar bucle infinito |

---

## ⚠️ Checklist antes de activar

- [ ] `lib/motopress-push.ts` creado
- [ ] Migración de Prisma ejecutada (`motopressId` en Booking)
- [ ] POST de reservas actualizado con el push a MotoPress
- [ ] Cancelaciones actualizadas para cancelar también en MotoPress
- [ ] Verificación anti-bucle agregada en `motopress-sync.ts`
- [ ] Prueba 1 completada (MiHostal → web)
- [ ] Prueba 2 completada (web → MiHostal)
- [ ] Prueba 3 completada (cancelación bidireccional)