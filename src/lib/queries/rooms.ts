import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const ROOM_STATUSES = ["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE"] as const;

export async function getRooms(establishmentId: string, status?: string) {
  const where: Prisma.RoomWhereInput = { establishmentId };
  if (status && status !== "" && ROOM_STATUSES.includes(status as (typeof ROOM_STATUSES)[number])) {
    where.status = status as (typeof ROOM_STATUSES)[number];
  }
  return prisma.room.findMany({
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
    orderBy: { roomNumber: "asc" },
  });
}
