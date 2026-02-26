# Instructivo de Integración — MotoPress Hotel Booking → MiHostal
**WordPress del Hotel de la Costa ↔ VPS 187.77.60.110**

---

## ¿Qué hace esta integración?

Cuando un cliente hace una reserva desde la página web del hotel (WordPress + MotoPress), esa reserva se sincroniza automáticamente en MiHostal. El personal no necesita ingresarla a mano.

```
Cliente reserva en la web del hotel
        ↓
WordPress + MotoPress registra la reserva
        ↓
MiHostal consulta la API de MotoPress (cada 5 min)
        ↓
La reserva aparece automáticamente en MiHostal
```

---

## PASO 1 — Obtener credenciales del cliente

Pedirle al cliente que haga esto en su WordPress:

1. Ir a **Alojamiento → Configuración → Avanzado**
2. Click en **"Agregar clave"**
3. Descripción: `MiHostal Integration`
4. Usuario: el administrador
5. Acceso: **Lectura**
6. Click en **"Generar clave API"**
7. Copiar y enviar el **Consumer Key** y **Consumer Secret**

> ⚠️ Estas claves solo se muestran una vez. Si se pierden hay que regenerarlas.

También necesitas la URL exacta del sitio WordPress del hotel, ejemplo:
`https://hoteldelacosta.cl`

---

## PASO 2 — Agregar variables de entorno en el VPS

Conectarse al servidor y editar el `.env`:

```bash
ssh root@187.77.60.110
cd /var/www/mihotel
nano .env
```

Agregar estas líneas:

```env
MOTOPRESS_URL="https://hoteldelacosta.cl"
MOTOPRESS_CONSUMER_KEY="ck_xxxxxxxxxxxxxxxxxxxxxxxx"
MOTOPRESS_CONSUMER_SECRET="cs_xxxxxxxxxxxxxxxxxxxxxxxx"
```

---

## PASO 3 — Actualizar el schema de Prisma

Agregar un campo para identificar reservas que vinieron desde MotoPress y evitar duplicados:

```prisma
// En schema.prisma, en el modelo Booking (o Reserva)
model Booking {
  // ... campos existentes ...

  externalId     String?   @unique  // ID de la reserva en MotoPress
  externalSource String?            // "motopress"
  syncedAt       DateTime?          // Última vez que se sincronizó
}

// Nueva tabla para registrar el historial de sincronizaciones
model SyncLog {
  id          Int      @id @default(autoincrement())
  source      String   // "motopress"
  status      String   // "success" | "error"
  message     String?
  bookingsFound Int    @default(0)
  bookingsCreated Int  @default(0)
  createdAt   DateTime @default(now())
}
```

Después de editar, correr la migración:

```bash
cd /var/www/mihotel
pnpm prisma migrate dev --name add_motopress_sync
```

---

## PASO 4 — Crear el servicio de sincronización

Crear el archivo `/lib/motopress-sync.ts`:

```typescript
// lib/motopress-sync.ts
import prisma from "@/lib/prisma";

const MOTOPRESS_URL = process.env.MOTOPRESS_URL!;
const CONSUMER_KEY = process.env.MOTOPRESS_CONSUMER_KEY!;
const CONSUMER_SECRET = process.env.MOTOPRESS_CONSUMER_SECRET!;

// Credenciales en Base64 para Basic Auth
const authHeader = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");

// Tipos de la respuesta de MotoPress
interface MotopressBooking {
  id: number;
  status: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  note?: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  reserved_accommodations: {
    accommodation: number;
    adults: number;
    children?: number;
  }[];
}

// Obtener reservas desde MotoPress
async function fetchMotopressBookings(): Promise<MotopressBooking[]> {
  const response = await fetch(
    `${MOTOPRESS_URL}/wp-json/mphb/v1/bookings?per_page=100`,
    {
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Error al consultar MotoPress: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Obtener tipos de habitación desde MotoPress
async function fetchMotopressRoomTypes(): Promise<any[]> {
  const response = await fetch(
    `${MOTOPRESS_URL}/wp-json/mphb/v1/room-types`,
    {
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Error al consultar room-types: ${response.status}`);
  }

  return response.json();
}

// Mapear estado de MotoPress al estado de MiHostal
function mapStatus(mpStatus: string): string {
  const statusMap: Record<string, string> = {
    confirmed: "confirmed",
    pending:   "pending",
    cancelled: "cancelled",
    abandoned: "cancelled",
  };
  return statusMap[mpStatus] ?? "pending";
}

// Función principal de sincronización
export async function syncMotopressBookings() {
  let bookingsFound = 0;
  let bookingsCreated = 0;

  try {
    const mpBookings = await fetchMotopressBookings();
    bookingsFound = mpBookings.length;

    for (const mpBooking of mpBookings) {
      const externalId = `motopress_${mpBooking.id}`;

      // Verificar si ya existe en MiHostal
      const existing = await prisma.booking.findUnique({
        where: { externalId },
      });

      if (existing) {
        // Actualizar estado si cambió
        if (existing.status !== mapStatus(mpBooking.status)) {
          await prisma.booking.update({
            where: { externalId },
            data: {
              status: mapStatus(mpBooking.status),
              syncedAt: new Date(),
            },
          });
        }
        continue;
      }

      // Obtener o crear el huésped
      let guest = await prisma.guest.findFirst({
        where: { email: mpBooking.customer.email },
      });

      if (!guest) {
        guest = await prisma.guest.create({
          data: {
            firstName: mpBooking.customer.first_name,
            lastName:  mpBooking.customer.last_name,
            email:     mpBooking.customer.email,
            phone:     mpBooking.customer.phone ?? null,
          },
        });
      }

      // Buscar la habitación correspondiente en MiHostal
      const accommodationId = mpBooking.reserved_accommodations[0]?.accommodation;
      const room = await prisma.room.findFirst({
        where: { externalId: String(accommodationId) },
      });

      // Crear la reserva en MiHostal
      await prisma.booking.create({
        data: {
          externalId,
          externalSource: "motopress",
          status:         mapStatus(mpBooking.status),
          checkIn:        new Date(mpBooking.check_in_date),
          checkOut:       new Date(mpBooking.check_out_date),
          totalPrice:     mpBooking.total_price,
          notes:          mpBooking.note ?? null,
          adults:         mpBooking.reserved_accommodations[0]?.adults ?? 1,
          children:       mpBooking.reserved_accommodations[0]?.children ?? 0,
          guestId:        guest.id,
          roomId:         room?.id ?? null,
          syncedAt:       new Date(),
        },
      });

      bookingsCreated++;
    }

    // Registrar sincronización exitosa
    await prisma.syncLog.create({
      data: {
        source:          "motopress",
        status:          "success",
        bookingsFound,
        bookingsCreated,
      },
    });

    return { success: true, bookingsFound, bookingsCreated };

  } catch (error: any) {
    // Registrar error
    await prisma.syncLog.create({
      data: {
        source:  "motopress",
        status:  "error",
        message: error.message,
        bookingsFound,
        bookingsCreated,
      },
    });

    throw error;
  }
}
```

---

## PASO 5 — Crear el endpoint de sincronización

Crear el archivo `/app/api/sync/motopress/route.ts`:

```typescript
// app/api/sync/motopress/route.ts
import { NextResponse } from "next/server";
import { syncMotopressBookings } from "@/lib/motopress-sync";

// Token secreto para proteger el endpoint
const SYNC_SECRET = process.env.SYNC_SECRET;

export async function POST(request: Request) {
  // Verificar token de seguridad
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${SYNC_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await syncMotopressBookings();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// También permitir GET para pruebas manuales desde el dashboard
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== SYNC_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await syncMotopressBookings();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

Agregar la variable al `.env`:

```env
SYNC_SECRET="una-clave-secreta-para-el-cron"
```

---

## PASO 6 — Configurar el cron job en el VPS

En el servidor, crear el script que llama al endpoint cada 5 minutos:

```bash
# Crear el script
nano /var/www/mihotel/scripts/sync-motopress.sh
```

Contenido del script:

```bash
#!/bin/bash
curl -s -X POST \
  -H "Authorization: Bearer TU_SYNC_SECRET_AQUI" \
  http://localhost:3000/api/sync/motopress \
  >> /var/log/mihotel-sync.log 2>&1

echo "" >> /var/log/mihotel-sync.log
echo "$(date): sync ejecutado" >> /var/log/mihotel-sync.log
```

```bash
# Dar permisos
chmod +x /var/www/mihotel/scripts/sync-motopress.sh

# Abrir el crontab
crontab -e

# Agregar esta línea para ejecutar cada 5 minutos
*/5 * * * * /var/www/mihotel/scripts/sync-motopress.sh
```

Verificar que el cron está corriendo:

```bash
# Ver los logs de sincronización
tail -f /var/log/mihotel-sync.log
```

---

## PASO 7 — Agregar botón de sincronización manual en el dashboard

Agregar un botón en la vista de reservas para sincronizar bajo demanda:

```typescript
// Componente SyncButton.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function SyncButton() {
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sync/motopress?secret=${process.env.NEXT_PUBLIC_SYNC_SECRET}`
      );
      const data = await res.json();

      if (res.ok) {
        toast.success(
          `Sincronización exitosa: ${data.bookingsCreated} reservas nuevas de ${data.bookingsFound} encontradas`
        );
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      toast.error("Error al sincronizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleSync}
      disabled={loading}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Sincronizando..." : "Sincronizar con web"}
    </Button>
  );
}
```

---

## PASO 8 — Mapear habitaciones entre WordPress y MiHostal

Para que la sincronización sepa a qué habitación corresponde cada reserva, hay que relacionar los IDs de MotoPress con los IDs de MiHostal.

Primero obtener los IDs de MotoPress:

```bash
# Probar en el navegador o con curl
curl -u "CONSUMER_KEY:CONSUMER_SECRET" \
  https://hoteldelacosta.cl/wp-json/mphb/v1/accommodations
```

Esto devuelve un JSON con el ID de cada habitación en WordPress. Luego en la base de datos de MiHostal hay que actualizar el campo `externalId` de cada habitación con ese ID.

```sql
-- Conectarse a la BD
sudo -u postgres psql -d hotelcosta_db

-- Ejemplo de mapeo (reemplazar IDs según corresponda)
UPDATE rooms SET external_id = '45' WHERE name = 'Habitación 1';
UPDATE rooms SET external_id = '46' WHERE name = 'Habitación 2';
-- ... y así con todas las habitaciones
```

---

## PASO 9 — Desplegar los cambios en el VPS

```bash
cd /var/www/mihotel

# Traer cambios
git pull origin main

# Instalar dependencias si hay nuevas
pnpm install

# Ejecutar migración de Prisma
pnpm prisma migrate deploy

# Recompilar
pnpm build

# Reiniciar la app
pm2 restart mihotel
```

---

## PASO 10 — Verificar que todo funciona

```bash
# Ejecutar sincronización manualmente por primera vez
curl -X POST \
  -H "Authorization: Bearer TU_SYNC_SECRET" \
  http://localhost:3000/api/sync/motopress

# Debería responder algo como:
# {"success":true,"bookingsFound":12,"bookingsCreated":12}

# Ver el log de sincronizaciones
tail -f /var/log/mihotel-sync.log
```

También verificar en la base de datos:

```sql
sudo -u postgres psql -d hotelcosta_db

-- Ver reservas importadas desde MotoPress
SELECT external_id, status, check_in, check_out, synced_at 
FROM bookings 
WHERE external_source = 'motopress'
ORDER BY synced_at DESC;

-- Ver historial de sincronizaciones
SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 10;
```

---

## Resumen de archivos a crear o modificar

| Archivo | Acción |
|---|---|
| `schema.prisma` | Agregar `externalId`, `externalSource`, `syncedAt` a Booking y crear modelo `SyncLog` |
| `lib/motopress-sync.ts` | Crear — servicio principal de sincronización |
| `app/api/sync/motopress/route.ts` | Crear — endpoint que ejecuta la sync |
| `components/SyncButton.tsx` | Crear — botón en el dashboard |
| `.env` | Agregar `MOTOPRESS_URL`, `MOTOPRESS_CONSUMER_KEY`, `MOTOPRESS_CONSUMER_SECRET`, `SYNC_SECRET` |
| `scripts/sync-motopress.sh` | Crear en el VPS — script del cron job |
| `crontab` | Configurar en el VPS — ejecución cada 5 minutos |

---

## ⚠️ Checklist antes de activar la sincronización

- [ ] Credenciales API generadas en WordPress del hotel
- [ ] Variables de entorno configuradas en el `.env` del VPS
- [ ] Migración de Prisma ejecutada sin errores
- [ ] Habitaciones mapeadas con sus IDs de MotoPress
- [ ] Endpoint probado manualmente y respondiendo OK
- [ ] Cron job configurado y corriendo
- [ ] Botón de sync visible en el dashboard
- [ ] Log de sincronizaciones revisado y sin errores