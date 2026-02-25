"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ROOM_TYPES = ["SINGLE", "DOUBLE", "TRIPLE", "QUADRUPLE", "PROMOTIONAL"] as const;
const ROOM_STATUSES = ["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE"] as const;

export type CreateRoomState = {
  error?: string;
  success?: boolean;
  duplicate?: boolean;
  existingRoomId?: string;
  roomNumber?: string;
};

export async function createRoom(_prev: CreateRoomState, formData: FormData): Promise<CreateRoomState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  const replaceRoomId = formData.get("replaceRoomId")?.toString();
  const roomNumber = formData.get("roomNumber")?.toString()?.trim();
  const type = formData.get("type")?.toString();
  const floorStr = formData.get("floor")?.toString();
  const priceStr = formData.get("pricePerNight")?.toString();
  const maxGuestsStr = formData.get("maxGuests")?.toString();
  const hasPrivateBath = formData.get("hasPrivateBath") === "true";

  if (!roomNumber) return { error: "El número de habitación es obligatorio" };
  if (!type || !ROOM_TYPES.includes(type as (typeof ROOM_TYPES)[number])) {
    return { error: "Tipo de habitación no válido" };
  }
  const floor = floorStr ? parseInt(floorStr, 10) : 1;
  if (Number.isNaN(floor) || floor < 1) return { error: "Piso debe ser 1 o más" };
  const pricePerNight = priceStr ? parseInt(priceStr.replace(/\D/g, ""), 10) : 0;
  if (Number.isNaN(pricePerNight) || pricePerNight < 0) return { error: "Precio no válido" };
  const maxGuests = maxGuestsStr ? parseInt(maxGuestsStr, 10) : 2;
  if (Number.isNaN(maxGuests) || maxGuests < 1) return { error: "Huéspedes máximos debe ser 1 o más" };

  // Reemplazar habitación existente (confirmado por el usuario en el modal)
  if (replaceRoomId) {
    try {
      await prisma.room.updateMany({
        where: {
          id: replaceRoomId,
          establishmentId: session.user.establishmentId,
        },
        data: {
          roomNumber,
          type: type as (typeof ROOM_TYPES)[number],
          floor,
          pricePerNight,
          maxGuests,
          hasPrivateBath,
        },
      });
      revalidatePath("/dashboard/rooms");
      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al actualizar la habitación";
      return { error: message };
    }
  }

  // Comprobar si ya existe una habitación con ese número
  const existing = await prisma.room.findFirst({
    where: {
      establishmentId: session.user.establishmentId,
      roomNumber,
    },
    select: { id: true, roomNumber: true },
  });
  if (existing) {
    return {
      duplicate: true,
      existingRoomId: existing.id,
      roomNumber: existing.roomNumber,
    };
  }

  try {
    await prisma.room.create({
      data: {
        establishmentId: session.user.establishmentId,
        roomNumber,
        type: type as (typeof ROOM_TYPES)[number],
        floor,
        pricePerNight,
        maxGuests,
        hasPrivateBath,
        status: "AVAILABLE",
      },
    });
    revalidatePath("/dashboard/rooms");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear la habitación";
    return { error: message };
  }
}

export type UpdateRoomState = { error?: string; success?: boolean };

export async function updateRoom(_prev: UpdateRoomState, formData: FormData): Promise<UpdateRoomState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  const roomId = formData.get("roomId")?.toString();
  if (!roomId) return { error: "Falta identificar la habitación" };

  const roomNumber = formData.get("roomNumber")?.toString()?.trim();
  const type = formData.get("type")?.toString();
  const floorStr = formData.get("floor")?.toString();
  const priceStr = formData.get("pricePerNight")?.toString();
  const maxGuestsStr = formData.get("maxGuests")?.toString();
  const hasPrivateBath = formData.get("hasPrivateBath") === "true";
  const status = formData.get("status")?.toString();

  if (!roomNumber) return { error: "El número de habitación es obligatorio" };
  if (!type || !ROOM_TYPES.includes(type as (typeof ROOM_TYPES)[number])) {
    return { error: "Tipo de habitación no válido" };
  }
  const floor = floorStr ? parseInt(floorStr, 10) : 1;
  if (Number.isNaN(floor) || floor < 1) return { error: "Piso debe ser 1 o más" };
  const pricePerNight = priceStr ? parseInt(priceStr.replace(/\D/g, ""), 10) : 0;
  if (Number.isNaN(pricePerNight) || pricePerNight < 0) return { error: "Precio no válido" };
  const maxGuests = maxGuestsStr ? parseInt(maxGuestsStr, 10) : 2;
  if (Number.isNaN(maxGuests) || maxGuests < 1) return { error: "Huéspedes máximos debe ser 1 o más" };
  if (!status || !ROOM_STATUSES.includes(status as (typeof ROOM_STATUSES)[number])) {
    return { error: "Estado no válido" };
  }

  try {
    await prisma.room.updateMany({
      where: {
        id: roomId,
        establishmentId: session.user.establishmentId,
      },
      data: {
        roomNumber,
        type: type as (typeof ROOM_TYPES)[number],
        floor,
        pricePerNight,
        maxGuests,
        hasPrivateBath,
        status: status as (typeof ROOM_STATUSES)[number],
      },
    });
    revalidatePath("/dashboard/rooms");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar la habitación";
    if (message.includes("Unique constraint") || message.includes("roomNumber")) {
      return { error: "Ya existe otra habitación con ese número" };
    }
    return { error: message };
  }
}

export type DeleteRoomState = { error?: string; success?: boolean };

export async function deleteRoom(roomId: string): Promise<DeleteRoomState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const room = await tx.room.findFirst({
        where: { id: roomId, establishmentId: session.user.establishmentId },
        select: { id: true },
      });
      if (!room) throw new Error("Habitación no encontrada");

      const reservationIds = await tx.reservation
        .findMany({ where: { roomId }, select: { id: true } })
        .then((r) => r.map((x) => x.id));

      if (reservationIds.length > 0) {
        await tx.payment.deleteMany({ where: { reservationId: { in: reservationIds } } });
        await tx.reservation.deleteMany({ where: { roomId } });
      }
      await tx.room.delete({ where: { id: roomId } });
    });
    revalidatePath("/dashboard/rooms");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar la habitación";
    return { error: message };
  }
}
