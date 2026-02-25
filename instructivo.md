# Instructivo de Implementación — Sistema de Gestión Hotel de la Costa

> **Versión:** 1.0  
> **Fecha:** 25 de febrero de 2026  
> **Desarrollador:** Francisco Dev  
> **Cliente:** Hotel de la Costa — Talcahuano, Biobío  
> **Estado actual:** Demo funcional con datos mock → Migrar a producción con base de datos real

---

## Índice

1. [Resumen del Proyecto](#1-resumen-del-proyecto)
2. [Dependencias — Qué instalar](#2-dependencias--qué-instalar)
3. [Arquitectura General](#3-arquitectura-general)
4. [Base de Datos — Schema Prisma](#4-base-de-datos--schema-prisma)
5. [Autenticación y Autorización](#5-autenticación-y-autorización)
6. [Módulos a Implementar](#6-módulos-a-implementar)
7. [Integración WordPress — MotoPress](#7-integración-wordpress--motopress)
8. [Seguridad](#8-seguridad)
9. [Optimización y Carga Rápida](#9-optimización-y-carga-rápida)
10. [Infraestructura y Deploy](#10-infraestructura-y-deploy)
11. [Plan de Migración Demo → Producción](#11-plan-de-migración-demo--producción)
12. [Variables de Entorno](#12-variables-de-entorno)
13. [Checklist Final Pre-Entrega](#13-checklist-final-pre-entrega)

---

## 1. Resumen del Proyecto

Sistema de gestión a medida para Hotel de la Costa. Administra las operaciones diarias: habitaciones, reservas, huéspedes, pagos, inventario y facturación interna. Incluye integración con la web del hotel (WordPress + MotoPress Hotel Booking) para sincronizar reservas online.

### 1.1 Datos del hotel

- **22 habitaciones** en 5 tipos
- **2 usuarios** del sistema (Administrador + Recepcionista)
- **~100 productos** de inventario
- **7 proveedores**
- Desayuno continental incluido en todas las tarifas
- Aceptan Visa, Mastercard, RedCompra (Transbank)

### 1.2 Tipos de habitación y tarifas

| Tipo | Capacidad | Precio/noche | Baño | Desayuno |
|------|-----------|-------------|------|----------|
| Single | 1 persona | $40.000 | Privado | Continental |
| Doble | 2 personas | $60.000 | Privado | Continental |
| Triple | 3 personas | $90.000 ($30.000 p/p) | Privado | Continental |
| Cuádruple | 4 personas | $120.000 | Privado | Continental |
| Promocional | 2-5 personas | $25.000 p/p | Compartido (exterior) | Incluido |

### 1.3 Alcance del sistema

- **Módulo base:** Dashboard, habitaciones, reservas, check-in/out, pagos, registro de actividad, reportes mensuales, roles (Admin/Recepcionista)
- **Módulo inventario:** ~100 productos, 7 proveedores, stock, alertas, historial de movimientos
- **Módulo facturación interna:** Registro de boletas y facturas (sin emisión electrónica ni SII)
- **Integración web:** MotoPress Hotel Booking ↔ Sistema vía REST API
- **Personalización:** Logo, colores del hotel, configuración de habitaciones, 2 cuentas de usuario, carga inicial de datos

---

## 2. Dependencias — Qué instalar

### 2.1 Estado actual del package.json (demo)

Lo que ya está instalado y se mantiene:

```
next 16.1.6           → Framework principal
react 19.2.3          → UI
react-dom 19.2.3      → Renderizado
date-fns ^4.1.0       → Manejo de fechas
lucide-react ^0.563.0 → Iconos
react-day-picker ^9   → Selector de fecha (calendario)
recharts ^3.7.0       → Gráficos (reportes, pagos)
tailwindcss ^4         → Estilos
typescript ^5          → Tipado
eslint + eslint-config-next → Linting
```

### 2.2 Dependencias nuevas de producción

Instalar con: `npm install <paquete>`

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `@prisma/client` | ^6 | ORM — Cliente para queries a PostgreSQL |
| `next-auth` | ^5 (beta) | Autenticación con Credentials provider y sesiones JWT |
| `@auth/prisma-adapter` | ^2 | Adaptador para conectar NextAuth con Prisma |
| `bcryptjs` | ^3 | Hash de contraseñas (12 salt rounds) |
| `zod` | ^3.23 | Validación de schemas en servidor y cliente |
| `sharp` | ^0.33 | Optimización de imágenes (Next.js Image optimization) |
| `@t3-oss/env-nextjs` | ^0.11 | Validación tipada de variables de entorno |

**Comando completo:**
```bash
npm install @prisma/client next-auth@beta @auth/prisma-adapter bcryptjs zod sharp @t3-oss/env-nextjs
```

### 2.3 Dependencias nuevas de desarrollo

Instalar con: `npm install -D <paquete>`

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `prisma` | ^6 | ORM — CLI para migraciones y generación de tipos |
| `@types/bcryptjs` | ^2.4 | Tipos TypeScript para bcryptjs |
| `tsx` | ^4 | Ejecutar el seed de Prisma en TypeScript |

**Comando completo:**
```bash
npm install -D prisma @types/bcryptjs tsx
```

### 2.4 Dependencias que NO se necesitan

| Paquete | Razón |
|---------|-------|
| `axios` | `fetch` nativo de Next.js soporta cache y revalidación |
| `moment` | Ya tenemos `date-fns`, más liviana y tree-shakeable |
| `@tanstack/react-query` | Server Components con revalidación de Next.js cubren todo |
| `formik / react-hook-form` | Server Actions + Zod cubren formularios sin librerías extra |
| `tailwind-merge / clsx` | No se usa capa de abstracción de clases |
| `nodemailer` | No se envían correos en esta versión |
| `stripe / mercadopago` | Pagos se registran manualmente, no hay cobro online |
| `@sentry/nextjs` | Se puede agregar después, no necesario para MVP |

### 2.5 package.json actualizado (resultado final)

```json
{
  "name": "hotel-de-la-costa",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "npx prisma generate && next build",
    "start": "next start",
    "lint": "eslint",
    "db:migrate": "npx prisma migrate dev",
    "db:push": "npx prisma db push",
    "db:seed": "npx prisma db seed",
    "db:studio": "npx prisma studio",
    "postinstall": "npx prisma generate"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@auth/prisma-adapter": "^2",
    "@prisma/client": "^6",
    "@t3-oss/env-nextjs": "^0.11",
    "bcryptjs": "^3",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.563.0",
    "next": "16.1.6",
    "next-auth": "^5",
    "react": "19.2.3",
    "react-day-picker": "^9.13.2",
    "react-dom": "19.2.3",
    "recharts": "^3.7.0",
    "sharp": "^0.33",
    "zod": "^3.23"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/bcryptjs": "^2.4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "prisma": "^6",
    "tailwindcss": "^4",
    "tsx": "^4",
    "typescript": "^5"
  }
}
```

---

## 3. Arquitectura General

### 3.1 Diagrama de infraestructura

```
┌──────────────────────────────────────────────────────────────────┐
│                    VPS Hostinger KVM 2                            │
│                 2 vCPU · 8GB RAM · Ubuntu 24                     │
│                                                                  │
│  ┌─────────────────────────┐   ┌──────────────────────────────┐  │
│  │     Nginx               │   │     PostgreSQL 16            │  │
│  │     - Reverse proxy     │   │     - Base de datos          │  │
│  │     - SSL (Certbot)     │   │     - Prisma migrations      │  │
│  │     - gzip / brotli     │   │     - Backups diarios (cron) │  │
│  │     - Cache estáticos   │   │     - Solo localhost         │  │
│  └────────┬────────────────┘   └──────────────────────────────┘  │
│           │                              ▲                        │
│           ▼                              │                        │
│  ┌─────────────────────────┐             │                        │
│  │     Next.js (PM2)       │─────────────┘                        │
│  │     - Server Components │                                      │
│  │     - Server Actions    │   ┌──────────────────────────────┐  │
│  │     - API Routes        │──►│  WordPress (existente)       │  │
│  │     - NextAuth          │   │  - MotoPress Hotel Booking   │  │
│  │     - Middleware         │   │  - REST API /wp-json/mphb/  │  │
│  └─────────────────────────┘   └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Flujo de datos

```
Reserva desde la web:
  Huésped → WordPress → MotoPress → Cron del sistema (cada 5 min) → Base de datos

Reserva manual:
  Recepcionista → Formulario → Server Action → Prisma → PostgreSQL → Revalidación UI

Consulta de dashboard:
  Admin → Server Component → Prisma query → Renderizado en servidor → HTML al navegador
```

### 3.3 Principios de diseño

1. **Server Components por defecto** — Client Components solo cuando hay interactividad (formularios, modales, estados).
2. **Datos sensibles nunca en el cliente** — Queries Prisma solo en Server Components y Server Actions.
3. **Validación doble** — Zod en el cliente (UX inmediata) y en el servidor (seguridad real).
4. **Sin APIs públicas** — Todo pasa por Server Actions protegidas con verificación de sesión.
5. **Principio de menor privilegio** — Cada rol ve solo lo que necesita.

---

## 4. Base de Datos — Schema Prisma

### 4.1 Inicialización

```bash
npx prisma init
```

Esto crea `prisma/schema.prisma` y `.env` con `DATABASE_URL`.

### 4.2 Configuración del schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 4.3 Modelo: Establishment

Datos del hotel. Un solo registro, pero modelado como tabla para flexibilidad.

```prisma
model Establishment {
  id         String   @id @default(cuid())
  name       String   // "Hotel de la Costa"
  address    String?
  phone      String?
  email      String?
  logoUrl    String?
  totalRooms Int      @default(22)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  users        User[]
  rooms        Room[]
  guests       Guest[]
  reservations Reservation[]
  payments     Payment[]
  products     InventoryProduct[]
  suppliers    Supplier[]
  invoices     Invoice[]
  activityLogs ActivityLog[]
}
```

### 4.4 Modelo: User

Usuarios del sistema. Solo 2 cuentas (admin y recepcionista). Contraseñas hasheadas con bcrypt (12 rounds).

```prisma
model User {
  id              String    @id @default(cuid())
  establishmentId String
  fullName        String
  email           String    @unique
  passwordHash    String    // bcrypt 12 rounds
  role            UserRole  @default(RECEPTIONIST)
  isActive        Boolean   @default(true)
  lastLoginAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  establishment Establishment  @relation(fields: [establishmentId], references: [id])
  payments      Payment[]      @relation("RegisteredBy")
  activityLogs  ActivityLog[]

  @@index([establishmentId])
}

enum UserRole {
  ADMIN
  RECEPTIONIST
}
```

### 4.5 Modelo: Room

Las 22 habitaciones con su tipo, tarifa y estado actual.

```prisma
model Room {
  id              String     @id @default(cuid())
  establishmentId String
  roomNumber      String
  type            RoomType
  pricePerNight   Int        // CLP sin decimales
  status          RoomStatus @default(AVAILABLE)
  floor           Int
  hasPrivateBath  Boolean    @default(true)
  maxGuests       Int        @default(2)
  description     String?
  notes           String?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  establishment Establishment @relation(fields: [establishmentId], references: [id])
  reservations  Reservation[]

  @@unique([establishmentId, roomNumber])
  @@index([establishmentId, status])
}

enum RoomType {
  SINGLE
  DOUBLE
  TRIPLE
  QUADRUPLE
  PROMOTIONAL
}

enum RoomStatus {
  AVAILABLE
  OCCUPIED
  CLEANING
  MAINTENANCE
}
```

### 4.6 Modelo: Guest

Huéspedes registrados. Se vinculan a reservas. RUT opcional.

```prisma
model Guest {
  id              String   @id @default(cuid())
  establishmentId String
  fullName        String
  rut             String?
  email           String?
  phone           String?
  nationality     String?  @default("Chile")
  notes           String?
  isBlacklisted   Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  establishment Establishment @relation(fields: [establishmentId], references: [id])
  reservations  Reservation[]

  @@index([establishmentId])
  @@index([fullName])
}
```

### 4.7 Modelo: Reservation

Reservas manuales o sincronizadas desde MotoPress. Soporta múltiples pagos (abonos).

```prisma
model Reservation {
  id              String            @id @default(cuid())
  establishmentId String
  roomId          String
  guestId         String
  checkIn         DateTime
  checkOut        DateTime
  numGuests       Int               @default(1)
  status          ReservationStatus @default(PENDING)
  totalAmount     Int               // total en CLP
  source          ReservationSource @default(MANUAL)
  motopressId     String?           @unique
  companyName     String?           // para reservas de empresa
  companyRut      String?
  companyEmail    String?
  paymentTermDays Int?              // 30 días hábiles para empresas
  notes           String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  establishment Establishment @relation(fields: [establishmentId], references: [id])
  room          Room          @relation(fields: [roomId], references: [id])
  guest         Guest         @relation(fields: [guestId], references: [id])
  payments      Payment[]

  @@index([establishmentId, status])
  @@index([roomId, checkIn, checkOut])
  @@index([guestId])
  @@index([checkIn])
  @@index([checkOut])
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  CHECKED_IN
  CHECKED_OUT
  CANCELLED
  NO_SHOW
}

enum ReservationSource {
  MANUAL
  MOTOPRESS
  PHONE
  WALKIN
}
```

### 4.8 Modelo: Payment

Pagos registrados manualmente. Soporta abonos parciales y distintos métodos.

```prisma
model Payment {
  id              String        @id @default(cuid())
  establishmentId String
  reservationId   String
  registeredById  String
  amount          Int           // monto CLP
  method          PaymentMethod
  status          PaymentStatus @default(COMPLETED)
  notes           String?
  paidAt          DateTime      @default(now())
  createdAt       DateTime      @default(now())

  establishment Establishment @relation(fields: [establishmentId], references: [id])
  reservation   Reservation   @relation(fields: [reservationId], references: [id])
  registeredBy  User          @relation("RegisteredBy", fields: [registeredById], references: [id])

  @@index([establishmentId, paidAt])
  @@index([reservationId])
}

enum PaymentMethod {
  CASH
  DEBIT
  CREDIT
  TRANSFER
  OTHER
}

enum PaymentStatus {
  COMPLETED
  PENDING
  REFUNDED
}
```

### 4.9 Modelo: InventoryProduct

Productos del inventario con control de stock mínimo y alertas.

```prisma
model InventoryProduct {
  id              String   @id @default(cuid())
  establishmentId String
  name            String
  category        String   // "Aseo", "Ropa de cama", "Desayuno", etc.
  stock           Int      @default(0)
  minStock        Int      @default(5)
  unit            String   // "unidad", "kg", "rollo", "litro"
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  establishment      Establishment       @relation(fields: [establishmentId], references: [id])
  movements          InventoryMovement[]
  invoiceItems       InvoiceItem[]

  @@index([establishmentId])
  @@index([establishmentId, category])
}
```

### 4.10 Modelo: InventoryMovement

Historial de entradas y salidas. Permite rastrear quién movió qué y cuándo.

```prisma
model InventoryMovement {
  id        String       @id @default(cuid())
  productId String
  type      MovementType
  quantity  Int
  folio     String?      // boleta/factura asociada
  note      String?
  createdAt DateTime     @default(now())

  product InventoryProduct @relation(fields: [productId], references: [id])

  @@index([productId])
  @@index([createdAt])
}

enum MovementType {
  ENTRY
  EXIT
}
```

### 4.11 Modelo: Supplier

Proveedores del hotel (7 inicialmente).

```prisma
model Supplier {
  id              String   @id @default(cuid())
  establishmentId String
  name            String
  rut             String?
  phone           String?
  email           String?
  createdAt       DateTime @default(now())

  establishment Establishment @relation(fields: [establishmentId], references: [id])
  invoices      Invoice[]

  @@index([establishmentId])
}
```

### 4.12 Modelo: Invoice e InvoiceItem

Boletas y facturas de registro interno (sin emisión electrónica).

```prisma
model Invoice {
  id              String      @id @default(cuid())
  establishmentId String
  supplierId      String?
  folio           String      // "B-0001", "F-0002"
  type            InvoiceType
  date            DateTime
  total           Int         // CLP
  photoUrls       String[]    // hasta 5 fotos del documento
  syncedInventory Boolean     @default(false)
  createdAt       DateTime    @default(now())

  establishment Establishment @relation(fields: [establishmentId], references: [id])
  supplier      Supplier?     @relation(fields: [supplierId], references: [id])
  items         InvoiceItem[]

  @@index([establishmentId])
  @@index([folio])
}

model InvoiceItem {
  id        String @id @default(cuid())
  invoiceId String
  productId String
  quantity  Int
  unitPrice Int?

  invoice Invoice          @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  product InventoryProduct @relation(fields: [productId], references: [id])
}

enum InvoiceType {
  BOLETA
  FACTURA
}
```

### 4.13 Modelo: ActivityLog

Registro de toda la actividad del sistema. Quién hizo qué y cuándo.

```prisma
model ActivityLog {
  id              String   @id @default(cuid())
  establishmentId String
  userId          String
  action          String   // "RESERVATION_CREATED", "PAYMENT_REGISTERED", etc.
  entityType      String   // "reservation", "payment", "room", etc.
  entityId        String?
  description     String?
  metadata        Json?
  createdAt       DateTime @default(now())

  establishment Establishment @relation(fields: [establishmentId], references: [id])
  user          User          @relation(fields: [userId], references: [id])

  @@index([establishmentId, createdAt])
  @@index([userId])
  @@index([entityType, entityId])
}
```

### 4.14 Seed inicial

Archivo `prisma/seed.ts` para cargar los datos iniciales:

- 1 Establishment (Hotel de la Costa, dirección, contacto)
- 2 Users (admin + recepcionista con contraseñas hasheadas)
- 22 Rooms (distribuidas por tipo según info del cliente)
- 7 Suppliers (nombres proporcionados por el cliente)
- ~100 InventoryProducts (lista proporcionada por el cliente)

### 4.15 Instancia singleton de Prisma

Archivo `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

## 5. Autenticación y Autorización

### 5.1 Reemplazar mock auth por NextAuth

**Archivos a eliminar:**
- `src/lib/mock-auth.ts` — funciones getMockSession y getMockSessionServer
- `src/app/api/auth/mock-login/route.ts` — endpoint de login mock
- `src/app/api/auth/mock-logout/route.ts` — endpoint de logout mock
- Cookie `mock_session` — ya no se usa
- Array `DEMO_USERS` en login-form.tsx — reemplazar por formulario real

**Archivos a crear:**

`src/lib/auth.ts` — Configuración central de NextAuth:

```typescript
// Configurar NextAuth con:
// - CredentialsProvider (email + contraseña)
// - Verificación con bcrypt.compare()
// - JWT strategy (no sessions en DB)
// - Callbacks: jwt (agregar role, establishmentId) y session (exponer role)
// - Páginas personalizadas: signIn → "/login"
```

`src/app/api/auth/[...nextauth]/route.ts` — Route handler de NextAuth.

`src/middleware.ts` (actualizar) — El middleware actual usa getMockSession. Reemplazar por `getToken()` de NextAuth para verificar JWT en el edge.

### 5.2 Formulario de login real

Reemplazar la selección de usuario demo por un formulario con campos email y contraseña. Usar `signIn("credentials", ...)` de NextAuth. Mostrar errores si las credenciales son incorrectas. No permitir más de 5 intentos fallidos por IP en 15 minutos (rate limiting).

### 5.3 Protección de rutas por rol

Helper `requireAuth(allowedRoles)` que se llama al inicio de cada Server Component y Server Action:

```typescript
export default async function ReportsPage() {
  const session = await requireAuth(["ADMIN"]);
  // Si no es admin, redirige automáticamente
  // Si no hay sesión, redirige a /login
}
```

### 5.4 Matriz de permisos

| Ruta / Acción | Admin | Recepcionista |
|----------------|-------|---------------|
| Dashboard | ✅ completo | ✅ limitado |
| Habitaciones — ver | ✅ | ✅ |
| Habitaciones — editar/crear | ✅ | ❌ |
| Reservas — ver | ✅ | ✅ |
| Reservas — crear/editar | ✅ | ✅ |
| Huéspedes — ver/crear/editar | ✅ | ✅ |
| Pagos — ver todos | ✅ | ✅ (solo propios) |
| Pagos — registrar | ✅ | ✅ |
| Pagos pendientes | ✅ | ✅ |
| Inventario — ver | ✅ | ✅ |
| Inventario — entrada/salida | ✅ | ✅ |
| Inventario — crear producto | ✅ | ❌ |
| Boletas/Facturas | ✅ | ✅ |
| Reportes | ✅ | ❌ |
| Configuración | ✅ | ❌ |

### 5.5 Estructura del token JWT

```typescript
{
  sub: "user_cuid",
  email: "admin@hotel.cl",
  name: "Sebastián",
  role: "ADMIN",
  establishmentId: "est_cuid"
}
```

Todas las queries Prisma filtran por `establishmentId` del token. Nunca se confía en un ID del cliente.

---

## 6. Módulos a Implementar

Para cada módulo: qué archivos de la demo modificar, qué datos mock reemplazar, y qué Server Actions crear.

### 6.1 Dashboard

**Archivos:** `admin-dashboard.tsx`, `receptionist-dashboard.tsx`

**Queries a crear en `src/lib/queries/dashboard.ts`:**
- `getDashboardStats(establishmentId)` — Ingresos del mes, ocupación, reservas activas, huéspedes actuales
- `getTodayPayments(establishmentId)` — Pagos del día
- `getPendingPaymentsPreview(establishmentId)` — Top 3 pendientes (personas + empresas)
- `getLowStockProducts(establishmentId)` — Productos bajo mínimo
- `getRecentActivity(establishmentId, limit: 5)` — Últimas actividades

**Optimización:** Usar `select` específico en Prisma. Considerar `unstable_cache` con revalidación cada 60 segundos.

### 6.2 Habitaciones

**Archivos:** `admin-rooms-view.tsx`, `receptionist-rooms-view.tsx`

**Server Actions en `src/lib/actions/rooms.ts`:**
- `getRooms(establishmentId, filters?)` — Listar con filtro por estado
- `createRoom(data)` — Solo admin. Validar roomNumber único con Zod
- `updateRoom(id, data)` — Solo admin. Tipo, precio, estado, notas
- `updateRoomStatus(id, status)` — Admin y recepcionista. Limpieza/mantenimiento

**Precargar:** Las 22 habitaciones con tipos y precios reales del hotel.

### 6.3 Reservas

**Archivos:** `admin-reservations-view.tsx`, `receptionist-reservations-view.tsx`

**Server Actions en `src/lib/actions/reservations.ts`:**
- `getReservations(establishmentId, filters?)` — Paginación, filtro por estado y fechas
- `getCalendarReservations(establishmentId, month, year)` — Optimizada para calendario: solo roomId, guestName, checkIn, checkOut, status
- `createReservation(data)` — **Validar disponibilidad** (no overlap en misma habitación)
- `updateReservationStatus(id, newStatus)` — Check-in, check-out, cancelación

**Validación crítica de overlap:**
```sql
WHERE roomId = X AND status NOT IN ('CANCELLED', 'NO_SHOW')
  AND checkIn < nuevaCheckOut AND checkOut > nuevaCheckIn
```

### 6.4 Huéspedes

**Archivos:** `admin-guests-view.tsx`, `receptionist-guests-view.tsx`

**Server Actions en `src/lib/actions/guests.ts`:**
- `getGuests(establishmentId, filters?)` — Búsqueda por nombre, email, RUT
- `getGuestDetail(id)` — Con historial de reservas y total gastado (aggregation)
- `createGuest(data)` — Validar RUT chileno si se ingresa (XX.XXX.XXX-X)
- `updateGuest(id, data)` — Editar datos
- `toggleBlacklist(id)` — Solo admin

### 6.5 Pagos

**Archivos:** `admin-payments-view.tsx`, `receptionist-payments-view.tsx`

**Server Actions en `src/lib/actions/payments.ts`:**
- `getPayments(establishmentId, filters?)` — Filtro por método, estado, fechas, búsqueda
- `registerPayment(data)` — Validar que monto no supere saldo pendiente. Registrar quién lo hizo (registeredById del token)
- `getDailyTotal(establishmentId, date)` — Total cobrado en un día
- `getMonthlyTotal(establishmentId, month, year)` — Total del mes
- `getPaymentsByMethod(establishmentId, month, year)` — Para gráfico de torta (Recharts)

### 6.6 Pagos pendientes

**Archivos:** `pending-payments-view.tsx`

**Queries:**
- `getPendingCompanies(establishmentId)` — Reservas donde companyName != null y saldo pendiente > 0
- `getPendingPersons(establishmentId)` — Reservas con pagos parciales (suma pagos < totalAmount)

Los campos `companyName`, `companyRut`, `companyEmail` y `paymentTermDays` ya están en el modelo Reservation (sección 4.7).

### 6.7 Inventario

**Archivos:** `inventory-view.tsx`

**Server Actions en `src/lib/actions/inventory.ts`:**
- `getProducts(establishmentId, filters?)` — Búsqueda y orden por stock
- `getLowStockProducts(establishmentId)` — stock < minStock
- `createProduct(data)` — Solo admin
- `registerMovement(productId, type, quantity, folio?)` — **Transacción atómica:**

```typescript
// prisma.$transaction para garantizar atomicidad:
// 1. Crear InventoryMovement
// 2. Actualizar stock del producto (increment o decrement)
// Si falla alguno, se revierte todo
```

### 6.8 Boletas y Facturas

**Archivos:** `invoices-view.tsx`

**Server Actions en `src/lib/actions/invoices.ts`:**
- `getInvoices(establishmentId, filters?)` — Búsqueda por folio y tipo
- `createInvoice(data)` — Con items vinculados a productos del inventario
- `uploadInvoicePhoto(invoiceId, file)` — Guardar en `/var/www/hotel-uploads/invoices/`, retornar URL
- `syncInvoiceWithInventory(invoiceId)` — Crear movimientos de entrada por cada item (transacción)

### 6.9 Reportes

**Archivos:** `admin-reports-view.tsx`

**Queries en `src/lib/queries/reports.ts`:**
- `getDailyIncome(establishmentId, month, year)` — LineChart
- `getDailyOccupancy(establishmentId, month, year)` — AreaChart
- `getPaymentBreakdown(establishmentId, month, year)` — PieChart
- `getTopRooms(establishmentId, month, year)` — BarChart
- `getMonthlyComparison(establishmentId, month, year)` — vs mes anterior

**Optimización:** Cachear con `unstable_cache`, revalidar cada 5 minutos.

### 6.10 Configuración

**Archivos:** `admin-settings-view.tsx`

**Server Actions en `src/lib/actions/settings.ts`:**
- `getEstablishment(id)` — Datos del hotel
- `updateEstablishment(id, data)` — Solo admin
- `getWorkers(establishmentId)` — Lista de usuarios
- `updateWorkerRole(userId, role)` — Solo admin
- `toggleWorkerActive(userId)` — Solo admin
- `changePassword(userId, oldPassword, newPassword)` — Verificar contraseña actual

### 6.11 Registro de actividad

Helper transversal `logActivity()` que se llama al final de cada Server Action:

```typescript
async function logActivity({
  establishmentId: string,
  userId: string,
  action: string,        // "RESERVATION_CREATED"
  entityType: string,    // "reservation"
  entityId?: string,
  description?: string,  // "Nueva reserva Hab. 102 - María González"
  metadata?: object
})
```

**Acciones a registrar:** Reserva creada/confirmada/check-in/check-out/cancelada, pago registrado, huésped creado/editado, movimiento inventario, factura creada/sincronizada, cambio estado habitación, cambio configuración, login/logout.

---

## 7. Integración WordPress — MotoPress

### 7.1 Endpoints de MotoPress

```
GET  /wp-json/mphb/v1/room-types     → Tipos de habitación
GET  /wp-json/mphb/v1/bookings       → Reservas realizadas
GET  /wp-json/mphb/v1/bookings/{id}  → Detalle de una reserva
```

Se requiere Application Password de WordPress.

### 7.2 Estrategia: Cron Job (polling cada 5 minutos)

Endpoint interno `/api/cron/sync-motopress` que:

1. Consulta últimas reservas de MotoPress con filtro `after` = última sincronización
2. Verifica si ya existe en la DB (por `motopressId`)
3. Si no existe: busca o crea el Guest, crea la Reservation con `source: MOTOPRESS`
4. Actualiza marca de tiempo de última sincronización

**Por qué no Webhooks:** MotoPress no tiene webhooks nativos confiables. Un cron cada 5 minutos es simple, predecible y suficiente para 22 habitaciones.

### 7.3 Protección del endpoint

```typescript
const authHeader = request.headers.get("Authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```

Cron del VPS:
```bash
*/5 * * * * curl -s -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/sync-motopress
```

### 7.4 Datos requeridos del cliente

- Acceso al panel de WordPress (URL + usuario + contraseña)
- Verificar que MotoPress tenga REST API habilitada
- Crear Application Password en WordPress

---

## 8. Seguridad

### 8.1 Contraseñas

- Hash con `bcryptjs` usando **12 salt rounds**. Nunca almacenar en texto plano.
- Mínimo 8 caracteres.
- El hash se genera solo en el servidor (Server Action o seed).

### 8.2 Sesiones y tokens

- JWT firmado con `NEXTAUTH_SECRET` (mínimo 32 caracteres, generar con `openssl rand -base64 32`).
- Token expira en **24 horas**. Se renueva automáticamente si el usuario está activo.
- Cookie: `httpOnly`, `secure` (HTTPS), `sameSite: lax`.

### 8.3 Protección CSRF

NextAuth incluye protección CSRF por defecto para Credentials. Los Server Actions de Next.js también tienen protección CSRF nativa (verifican header `Origin`).

### 8.4 Rate limiting

Prevenir fuerza bruta en login:

- Máximo **5 intentos fallidos por IP** en ventana de **15 minutos**.
- Usar un Map en memoria (suficiente para 2 usuarios).

```typescript
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
// En cada intento fallido, incrementar count
// Si count >= 5 y han pasado < 15min, rechazar con error 429
// Si han pasado >= 15min, resetear contador
```

### 8.5 Validación de inputs con Zod

Toda entrada del usuario se valida antes de llegar a Prisma:

```typescript
const createReservationSchema = z.object({
  roomId: z.string().cuid(),
  guestId: z.string().cuid(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  numGuests: z.number().int().min(1).max(10),
  totalAmount: z.number().int().min(0),
  notes: z.string().max(500).optional(),
});
```

**Reglas:**
- Siempre validar en el servidor, aunque también se valide en el cliente.
- Strings: limitar longitud máxima (prevenir payloads enormes).
- Números: validar rangos razonables.
- IDs: validar formato cuid.
- Fechas: validar formato y que checkOut > checkIn.

### 8.6 SQL Injection

Prisma ORM previene SQL injection por diseño (usa prepared statements). **Nunca usar `prisma.$queryRawUnsafe()`** con datos del usuario sin sanitizar.

### 8.7 Headers de seguridad (Nginx)

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 8.8 Base de datos

- PostgreSQL solo escucha en `localhost` (no exponer puerto 5432).
- Usuario DB con **permisos mínimos**: solo SELECT, INSERT, UPDATE, DELETE. Sin DROP ni ALTER.
- Contraseña DB: mínimo **20 caracteres** alfanuméricos.
- Backups diarios encriptados.

### 8.9 Variables de entorno

- Nunca commitear `.env` al repositorio (agregar a `.gitignore`).
- En VPS: `.env.production` con permisos `600` (solo owner puede leer).
- Usar `@t3-oss/env-nextjs` para validar que todas las variables requeridas estén presentes al iniciar la app.

### 8.10 Uploads de imágenes (fotos de facturas)

- Validar tipo MIME: solo `image/jpeg`, `image/png`, `image/webp`.
- Limitar tamaño: máximo **5MB por imagen**, máximo **5 imágenes por factura**.
- Renombrar archivos con UUID (nunca usar nombre original del usuario).
- Almacenar fuera del directorio de la app: `/var/www/hotel-uploads/`.
- Servir vía Nginx con cache headers.

---

## 9. Optimización y Carga Rápida

### 9.1 Server Components (máximo rendimiento por defecto)

**Se renderizan en el servidor (sin JS al cliente):**
- Dashboard (estadísticas, métricas, widgets)
- Listas de habitaciones, reservas, huéspedes, pagos
- Reportes (gráficos con Recharts)
- Todas las queries Prisma

**Se renderizan en el cliente (`"use client"`):**
- `dashboard-shell.tsx` — Menú móvil (toggle state)
- `dashboard-sidebar.tsx` — Estado colapsado/expandido
- Modales de crear/editar (formularios con estado)
- Filtros interactivos (búsqueda, selects, date pickers)
- Gráficos con tooltips interactivos

**Regla:** Si un componente no necesita `useState`, `useEffect`, ni event handlers, no lleva `"use client"`.

### 9.2 Queries Prisma optimizadas

```typescript
// MAL: traer todo
const rooms = await prisma.room.findMany();

// BIEN: traer solo lo que se muestra
const rooms = await prisma.room.findMany({
  where: { establishmentId },
  select: {
    id: true,
    roomNumber: true,
    type: true,
    status: true,
    pricePerNight: true,
    floor: true,
  },
  orderBy: { roomNumber: "asc" },
});
```

Para dashboard, usar `_count` y `_sum` de Prisma:

```typescript
// Contar reservas activas (sin traer datos)
const activeReservations = await prisma.reservation.count({
  where: { establishmentId, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
});

// Sumar ingresos del mes (sin traer pagos individuales)
const monthlyIncome = await prisma.payment.aggregate({
  where: { establishmentId, paidAt: { gte: startOfMonth, lt: endOfMonth } },
  _sum: { amount: true },
});
```

### 9.3 Índices de base de datos

| Query frecuente | Índice que la cubre |
|-------|---------------------|
| Habitaciones por estado | `@@index([establishmentId, status])` en Room |
| Reservas por rango de fechas | `@@index([roomId, checkIn, checkOut])` en Reservation |
| Pagos del mes | `@@index([establishmentId, paidAt])` en Payment |
| Actividad reciente | `@@index([establishmentId, createdAt])` en ActivityLog |
| Búsqueda de huéspedes | `@@index([fullName])` en Guest |
| Productos por categoría | `@@index([establishmentId, category])` en InventoryProduct |

### 9.4 Cache y revalidación

```typescript
import { unstable_cache } from "next/cache";

// Para datos que cambian poco (configuración del hotel):
const getEstablishment = unstable_cache(
  async (id: string) => prisma.establishment.findUnique({ where: { id } }),
  ["establishment"],
  { revalidate: 3600 } // 1 hora
);
```

Después de cada Server Action que modifica datos:
```typescript
revalidatePath("/dashboard");
revalidatePath("/dashboard/rooms");
// etc.
```

### 9.5 Compresión (Nginx)

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript
           text/xml application/xml image/svg+xml;
```

### 9.6 Cache de estáticos (Nginx)

```nginx
location /_next/static/ {
    expires 365d;
    add_header Cache-Control "public, immutable";
}

location /favicon.ico {
    expires 30d;
}
```

### 9.7 Optimización de imágenes

`sharp` instalado para que Next.js optimice automáticamente con `next/image`. En `next.config.ts`:

```typescript
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    minimumCacheTTL: 86400, // 24 horas
  },
};
```

### 9.8 Bundle size

- **Tree-shaking de Lucide:** Importar iconos individualmente (`import { Menu } from "lucide-react"`). Ya se hace.
- **Tree-shaking de date-fns:** Importar funciones individualmente (`import { format } from "date-fns"`). Ya se hace.
- **Recharts solo en páginas que lo usan:** Next.js hace code-splitting automático por ruta.
- **No importar Prisma en Client Components:** Prisma solo existe en el servidor.

### 9.9 Loading states y streaming

Archivos `loading.tsx` con skeletons:

```
src/app/dashboard/loading.tsx
src/app/dashboard/rooms/loading.tsx
src/app/dashboard/reservations/loading.tsx
src/app/dashboard/guests/loading.tsx
src/app/dashboard/payments/loading.tsx
src/app/dashboard/inventory/loading.tsx
```

Cada `loading.tsx` muestra un esqueleto que aparece instantáneamente mientras se cargan los datos.

### 9.10 Prefetching

Next.js hace prefetch automático de los links visibles con `<Link>`. El sidebar ya usa `<Link>` de Next.js, las páginas se precargan cuando el usuario ve el menú. No requiere configuración adicional.

---

## 10. Infraestructura y Deploy

### 10.1 VPS recomendado

**Hostinger KVM 2** — €6.99/mes: 2 vCPU, 8 GB RAM, 100 GB NVMe, Ubuntu 24.04 LTS.

### 10.2 Setup inicial del servidor

```bash
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Instalar PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# 4. Instalar Nginx
sudo apt install -y nginx

# 5. Instalar PM2
sudo npm install -g pm2

# 6. Instalar Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx

# 7. Configurar firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
# NO abrir puerto 5432 (PostgreSQL solo local)
# NO abrir puerto 3000 (Next.js solo via Nginx)
```

### 10.3 Configurar PostgreSQL

```bash
sudo -u postgres psql
```
```sql
CREATE USER hotelcosta WITH PASSWORD '<contraseña-segura-20-chars>';
CREATE DATABASE hotelcosta OWNER hotelcosta;
GRANT ALL PRIVILEGES ON DATABASE hotelcosta TO hotelcosta;
\q
```

### 10.4 Configurar Nginx

```nginx
server {
    listen 80;
    server_name sistema.hoteldelacosta.cl;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sistema.hoteldelacosta.cl;

    ssl_certificate /etc/letsencrypt/live/sistema.hoteldelacosta.cl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sistema.hoteldelacosta.cl/privkey.pem;

    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Compresión
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml image/svg+xml;

    # Cache de estáticos de Next.js
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Fotos de facturas
    location /uploads/ {
        alias /var/www/hotel-uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Proxy a Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 10.5 Deploy con PM2

```bash
npm install
npx prisma migrate deploy
npx prisma db seed
npm run build

pm2 start npm --name "hotel-costa" -- start
pm2 save
pm2 startup  # para que reinicie en reboot
```

### 10.6 Backups automáticos

Script `/home/deploy/backup-db.sh`:

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/deploy/backups"
mkdir -p $BACKUP_DIR

pg_dump -U hotelcosta hotelcosta | gzip > "$BACKUP_DIR/hotel_$TIMESTAMP.sql.gz"

# Eliminar backups de más de 30 días
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

```bash
# Programar en crontab (diario a las 3:00 AM)
crontab -e
0 3 * * * /home/deploy/backup-db.sh
```

### 10.7 Cron de sincronización MotoPress

```bash
*/5 * * * * curl -s -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/sync-motopress >> /var/log/motopress-sync.log 2>&1
```

---

## 11. Plan de Migración Demo → Producción

### Fase 1: Setup base (1-2 días)

1. Instalar dependencias nuevas (sección 2)
2. Crear `prisma/schema.prisma` con todos los modelos (sección 4)
3. Crear base de datos PostgreSQL local
4. `npx prisma migrate dev --name init`
5. Crear `prisma/seed.ts` con datos iniciales
6. `npx prisma db seed`
7. Crear `src/lib/db.ts` (singleton Prisma)
8. Configurar `src/lib/env.ts` con `@t3-oss/env-nextjs`

### Fase 2: Autenticación (1 día)

1. Configurar NextAuth en `src/lib/auth.ts`
2. Crear route handler `src/app/api/auth/[...nextauth]/route.ts`
3. Reemplazar `login-form.tsx` con formulario real
4. Actualizar middleware para usar `getToken()` de NextAuth
5. Crear helper `requireAuth()`
6. Eliminar archivos mock
7. Actualizar sidebar: logout con `signOut()` de NextAuth
8. Actualizar layout: sesión con `auth()` de NextAuth

### Fase 3: Módulos con datos reales (5-7 días)

Orden de migración (de menor a mayor dependencia):

1. **Configuración** — Verificar conexión DB
2. **Habitaciones** — Base para reservas
3. **Huéspedes** — Base para reservas
4. **Reservas** — Depende de habitaciones y huéspedes
5. **Pagos** — Depende de reservas
6. **Pagos pendientes** — Depende de pagos y reservas
7. **Inventario** — Independiente
8. **Boletas/Facturas** — Depende de inventario
9. **Dashboard** — Depende de todo (queries de resumen)
10. **Reportes** — Depende de todo (queries de aggregation)

Para cada módulo crear:
- `src/lib/queries/<modulo>.ts` — funciones de consulta
- `src/lib/actions/<modulo>.ts` — Server Actions (mutations)
- `src/lib/schemas/<modulo>.ts` — schemas Zod
- Actualizar componente para usar datos reales
- Eliminar datos mock

### Fase 4: Integración MotoPress (1-2 días)

1. Obtener acceso WordPress del cliente
2. Crear Application Password en WordPress
3. Implementar `src/lib/motopress/client.ts`
4. Implementar `src/app/api/cron/sync-motopress/route.ts`
5. Probar sincronización con reservas de prueba
6. Configurar cron en VPS

### Fase 5: Pulido y optimización (1-2 días)

1. Agregar `loading.tsx` (skeletons) en cada ruta
2. Revisar `revalidatePath` en todos los Server Actions
3. Configurar `next.config.ts` con optimización de imágenes
4. Verificar no hay imports de Prisma en Client Components
5. `npm run build` — verificar sin errores
6. Probar flujo completo: login → reserva → pago → check-out

### Fase 6: Deploy (1 día)

1. Configurar VPS (sección 10)
2. Subir código (git clone o scp)
3. Configurar `.env.production`
4. Migraciones y seed en producción
5. Build y arrancar con PM2
6. Configurar Nginx y SSL
7. Configurar crons (backups + MotoPress)
8. Probar desde dominio real

**Tiempo total estimado: 10-15 días de desarrollo**

---

## 12. Variables de Entorno

### 12.1 Desarrollo (.env)

```bash
DATABASE_URL="postgresql://hotelcosta:password@localhost:5432/hotelcosta"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generar-con-openssl-rand-base64-32"
MOTOPRESS_API_URL="https://hoteldelacosta.cl/wp-json/mphb/v1"
MOTOPRESS_USERNAME="api-user"
MOTOPRESS_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"
CRON_SECRET="generar-con-openssl-rand-base64-32"
NODE_ENV="development"
```

### 12.2 Producción (.env.production)

```bash
DATABASE_URL="postgresql://hotelcosta:<pass-seguro>@localhost:5432/hotelcosta"
NEXTAUTH_URL="https://sistema.hoteldelacosta.cl"
NEXTAUTH_SECRET="<secreto-produccion-32-chars>"
MOTOPRESS_API_URL="https://hoteldelacosta.cl/wp-json/mphb/v1"
MOTOPRESS_USERNAME="<user>"
MOTOPRESS_APP_PASSWORD="<pass>"
CRON_SECRET="<secreto-cron-32-chars>"
NODE_ENV="production"
```

---

## 13. Checklist Final Pre-Entrega

### Funcionalidad

- [ ] Login funciona con credenciales reales
- [ ] Dashboard muestra datos reales del hotel
- [ ] Se pueden crear, editar y cancelar reservas
- [ ] El calendario muestra reservas sin overlap
- [ ] Se pueden registrar pagos (completos y abonos)
- [ ] Los pagos pendientes se calculan correctamente
- [ ] Inventario permite entradas/salidas con transacciones atómicas
- [ ] Boletas/facturas se crean con fotos
- [ ] Sincronización con inventario funciona por folio
- [ ] Reportes muestran gráficos con datos reales
- [ ] Configuración permite editar datos del hotel
- [ ] Actividad se registra en el log
- [ ] Sincronización MotoPress trae reservas de la web

### Seguridad

- [ ] Contraseñas hasheadas con bcrypt (12 rounds)
- [ ] JWT firmado con secret de 32+ caracteres
- [ ] Cookies httpOnly + secure + sameSite
- [ ] Rate limiting en login (5 intentos / 15 min)
- [ ] Validación Zod en todos los Server Actions
- [ ] Protección por rol en todas las rutas
- [ ] Headers de seguridad en Nginx
- [ ] PostgreSQL solo escucha en localhost
- [ ] Puerto 3000 no expuesto al exterior
- [ ] Variables de entorno no commiteadas
- [ ] Uploads validados (tipo MIME, tamaño máximo)
- [ ] Endpoint cron protegido con token

### Rendimiento

- [ ] Server Components en la mayoría de páginas
- [ ] Queries Prisma con select específico
- [ ] Índices en columnas frecuentemente consultadas
- [ ] Compresión gzip en Nginx
- [ ] Cache de estáticos con immutable en Nginx
- [ ] sharp instalado para optimización de imágenes
- [ ] loading.tsx con skeletons en rutas principales
- [ ] revalidatePath después de cada mutation
- [ ] Bundle JS mínimo (tree-shaking, code-splitting)

### Infraestructura

- [ ] SSL activo con Certbot (auto-renovación)
- [ ] PM2 configurado con startup automático
- [ ] Backups diarios de DB (cron 3:00 AM)
- [ ] Cron MotoPress cada 5 min
- [ ] Firewall UFW activo (puertos 22, 80, 443)
- [ ] Directorio uploads con permisos correctos

### Entrega al cliente

- [ ] Logo y colores del hotel aplicados
- [ ] 22 habitaciones configuradas con precios reales
- [ ] 2 cuentas de usuario creadas
- [ ] Productos de inventario cargados
- [ ] Proveedores cargados
- [ ] Capacitación básica realizada
- [ ] Período de garantía de 30 días iniciado