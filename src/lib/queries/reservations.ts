import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const RESERVATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "NO_SHOW",
] as const;

export async function getReservations(establishmentId: string, status?: string) {
  const where: Prisma.ReservationWhereInput = { establishmentId };
  if (status && status !== "" && RESERVATION_STATUSES.includes(status as (typeof RESERVATION_STATUSES)[number])) {
    where.status = status as (typeof RESERVATION_STATUSES)[number];
  }
  return prisma.reservation.findMany({
    where,
    include: {
      guest: true,
      room: true,
      payments: true,
      consumptions: { orderBy: { createdAt: "asc" } },
      processedBy: { select: { id: true, fullName: true } },
    },
    // checkIn desc: más recientes primero; createdAt desc: misma fecha = más recientes arriba, así no “baja” al confirmar
    orderBy: [{ checkIn: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
}

export async function getReservationsByGuestId(establishmentId: string, guestId: string) {
  return prisma.reservation.findMany({
    where: { establishmentId, guestId },
    include: {
      room: true,
    },
    orderBy: { checkIn: "desc" },
    take: 50,
  });
}

/** Una reserva por ID (para mostrar en Pagos cuando se viene desde "Registrar pago" y aún no hay pagos). */
export async function getReservationById(establishmentId: string, reservationId: string) {
  return prisma.reservation.findFirst({
    where: { id: reservationId, establishmentId },
    include: { guest: true, room: true, payments: true, processedBy: { select: { id: true, fullName: true } } },
  });
}
