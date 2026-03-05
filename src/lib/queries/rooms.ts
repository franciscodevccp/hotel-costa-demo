import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const ROOM_STATUSES = ["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE"] as const;

export async function getRooms(establishmentId: string, status?: string) {
  const where: Prisma.RoomWhereInput = { establishmentId };
  if (status && status !== "" && ROOM_STATUSES.includes(status as (typeof ROOM_STATUSES)[number])) {
    where.status = status as (typeof ROOM_STATUSES)[number];
  }
  const rooms = await prisma.room.findMany({
    where,
    select: {
      id: true,
      roomNumber: true,
      type: true,
      status: true,
      floor: true,
      pricePerNight: true,
      hasPrivateBath: true,
      maxGuests: true,
    },
  });

  // Habitaciones con reserva activa hoy (confirmada o check-in) → se muestran como Ocupada
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const occupiedRoomIds = await prisma.reservation
    .findMany({
      where: {
        establishmentId,
        roomId: { in: rooms.map((r) => r.id) },
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
        checkIn: { lte: todayEnd },
        checkOut: { gt: todayStart },
      },
      select: { roomId: true },
    })
    .then((rows) => new Set(rows.map((r) => r.roomId)));

  const withDisplayStatus = rooms.map((r) => ({
    ...r,
    displayStatus: occupiedRoomIds.has(r.id) ? ("OCCUPIED" as const) : r.status,
  }));

  // Orden numérico: 1, 2, 3, … 10, 11, … 22 (no 1, 10, 11, 2, 20…)
  return withDisplayStatus.sort((a, b) => {
    const na = Number(a.roomNumber);
    const nb = Number(b.roomNumber);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
  });
}
