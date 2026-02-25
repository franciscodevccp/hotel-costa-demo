"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getReservationsByGuestId } from "@/lib/queries/reservations";

export type CreateGuestState = { error?: string; guest?: { id: string; fullName: string; email: string } };

export async function createGuest(
  _prev: CreateGuestState,
  formData: FormData
): Promise<CreateGuestState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  const fullName = formData.get("fullName")?.toString()?.trim();
  const email = formData.get("email")?.toString()?.trim() || null;
  const phone = formData.get("phone")?.toString()?.trim() || null;
  const rut = formData.get("rut")?.toString()?.trim() || null;
  const emergencyContactName = formData.get("emergencyContactName")?.toString()?.trim() || null;
  const emergencyContactPhone = formData.get("emergencyContactPhone")?.toString()?.trim() || null;
  const emergencyContact =
    emergencyContactName || emergencyContactPhone
      ? [emergencyContactName, emergencyContactPhone].filter(Boolean).join(" · ")
      : null;
  const nationality = formData.get("nationality")?.toString()?.trim() || "Chile";

  if (!fullName) return { error: "El nombre completo es obligatorio" };
  if (!email) return { error: "El email es obligatorio" };
  if (!phone) return { error: "El teléfono es obligatorio" };
  if (!rut) return { error: "El RUT es obligatorio" };

  try {
    const guest = await prisma.guest.create({
      data: {
        establishmentId: session.user.establishmentId,
        fullName,
        email: email!,
        phone: phone!,
        rut,
        emergencyContact,
        nationality,
      },
      select: { id: true, fullName: true, email: true },
    });
    revalidatePath("/dashboard/guests");
    revalidatePath("/dashboard/reservations");
    return {
      guest: {
        id: guest.id,
        fullName: guest.fullName,
        email: guest.email ?? "",
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear el huésped";
    return { error: message };
  }
}

export type GuestReservationItem = {
  id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  roomNumber: string;
  totalAmount: number;
  nights: number;
};

export async function getGuestReservationsAction(guestId: string): Promise<GuestReservationItem[] | { error: string }> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }
  const rows = await getReservationsByGuestId(session.user.establishmentId, guestId);
  return rows.map((r) => ({
    id: r.id,
    checkIn: r.checkIn.toISOString().slice(0, 10),
    checkOut: r.checkOut.toISOString().slice(0, 10),
    status: r.status,
    roomNumber: r.room.roomNumber,
    totalAmount: r.totalAmount,
    nights: Math.max(0, Math.ceil((r.checkOut.getTime() - r.checkIn.getTime()) / (1000 * 60 * 60 * 24))),
  }));
}

export type UpdateGuestState = { error?: string; success?: boolean };

export async function updateGuest(
  _prev: UpdateGuestState,
  formData: FormData
): Promise<UpdateGuestState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  const guestId = formData.get("guestId")?.toString();
  if (!guestId) return { error: "Huésped no especificado" };

  const fullName = formData.get("fullName")?.toString()?.trim();
  const email = formData.get("email")?.toString()?.trim() || null;
  const phone = formData.get("phone")?.toString()?.trim() || null;
  const rut = formData.get("rut")?.toString()?.trim() || null;
  const emergencyContactName = formData.get("emergencyContactName")?.toString()?.trim() || null;
  const emergencyContactPhone = formData.get("emergencyContactPhone")?.toString()?.trim() || null;
  const emergencyContact =
    emergencyContactName || emergencyContactPhone
      ? [emergencyContactName, emergencyContactPhone].filter(Boolean).join(" · ")
      : null;
  const notes = formData.get("notes")?.toString()?.trim() || null;

  if (!fullName) return { error: "El nombre completo es obligatorio" };
  if (!email) return { error: "El email es obligatorio" };
  if (!phone) return { error: "El teléfono es obligatorio" };
  if (!rut) return { error: "El RUT es obligatorio" };

  try {
    const updated = await prisma.guest.updateMany({
      where: {
        id: guestId,
        establishmentId: session.user.establishmentId,
      },
      data: {
        fullName,
        email: email!,
        phone: phone!,
        rut,
        emergencyContact,
        notes,
      },
    });
    if (updated.count === 0) return { error: "Huésped no encontrado" };
    revalidatePath("/dashboard/guests");
    revalidatePath("/dashboard/reservations");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar el huésped";
    return { error: message };
  }
}

export async function setGuestBlocked(guestId: string, blockReason: string): Promise<UpdateGuestState> {
  const session = await auth();
  if (!session?.user?.establishmentId) return { error: "No autorizado" };
  const reason = blockReason?.trim() || null;
  if (!reason) return { error: "Indique el motivo del bloqueo" };
  try {
    const updated = await prisma.guest.updateMany({
      where: { id: guestId, establishmentId: session.user.establishmentId },
      data: { isBlacklisted: true, blockReason: reason } as Parameters<typeof prisma.guest.updateMany>[0]["data"],
    });
    if (updated.count === 0) return { error: "Huésped no encontrado" };
    revalidatePath("/dashboard/guests");
    revalidatePath("/dashboard/reservations");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al bloquear" };
  }
}

export async function setGuestUnblocked(guestId: string): Promise<UpdateGuestState> {
  const session = await auth();
  if (!session?.user?.establishmentId) return { error: "No autorizado" };
  try {
    const updated = await prisma.guest.updateMany({
      where: { id: guestId, establishmentId: session.user.establishmentId },
      data: { isBlacklisted: false, blockReason: null } as Parameters<typeof prisma.guest.updateMany>[0]["data"],
    });
    if (updated.count === 0) return { error: "Huésped no encontrado" };
    revalidatePath("/dashboard/guests");
    revalidatePath("/dashboard/reservations");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al desbloquear" };
  }
}
