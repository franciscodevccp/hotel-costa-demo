"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type CreateReservationState = { error?: string; success?: boolean };

export async function createReservation(
  _prev: CreateReservationState,
  formData: FormData
): Promise<CreateReservationState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  const guestId = formData.get("guestId")?.toString();
  const roomId = formData.get("roomId")?.toString();
  const checkInStr = formData.get("checkIn")?.toString();
  const checkOutStr = formData.get("checkOut")?.toString();
  const numGuestsStr = formData.get("numGuests")?.toString();
  const totalAmountStr = formData.get("totalAmount")?.toString();
  const downPaymentStr = formData.get("downPayment")?.toString();
  const downPaymentMethodStr = formData.get("downPaymentMethod")?.toString() || "CASH";
  const notes = formData.get("notes")?.toString()?.trim() || null;

  const VALID_PAYMENT_METHODS = ["CASH", "DEBIT", "CREDIT", "TRANSFER", "OTHER"] as const;
  const downPaymentMethod = VALID_PAYMENT_METHODS.includes(downPaymentMethodStr as (typeof VALID_PAYMENT_METHODS)[number])
    ? (downPaymentMethodStr as (typeof VALID_PAYMENT_METHODS)[number])
    : "CASH";

  if (!guestId) return { error: "Seleccione un huésped" };
  if (!roomId) return { error: "Seleccione una habitación" };
  if (!checkInStr) return { error: "La fecha de check-in es obligatoria" };
  if (!checkOutStr) return { error: "La fecha de check-out es obligatoria" };

  const checkIn = new Date(checkInStr);
  const checkOut = new Date(checkOutStr);
  if (Number.isNaN(checkIn.getTime())) return { error: "Fecha de check-in no válida" };
  if (Number.isNaN(checkOut.getTime())) return { error: "Fecha de check-out no válida" };
  if (checkIn >= checkOut) return { error: "El check-out debe ser posterior al check-in" };

  // Comparar solo día civil (evitar error por UTC: "2026-02-25" es medianoche UTC = 24 feb en Chile)
  const [y, m, d] = checkInStr.split("-").map(Number);
  const checkInDateOnly = new Date(y, m - 1, d);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (checkInDateOnly < todayStart) return { error: "El check-in no puede ser una fecha anterior a hoy" };

  const numGuests = numGuestsStr ? parseInt(numGuestsStr, 10) : 1;
  if (Number.isNaN(numGuests) || numGuests < 1) return { error: "Número de huéspedes debe ser al menos 1" };

  const totalAmount = totalAmountStr ? parseInt(totalAmountStr.replace(/\D/g, ""), 10) : 0;
  if (Number.isNaN(totalAmount) || totalAmount < 0) return { error: "El monto total no es válido" };

  const downPayment = downPaymentStr ? parseInt(downPaymentStr.replace(/\D/g, ""), 10) : 0;
  if (Number.isNaN(downPayment) || downPayment < 0) return { error: "El abono no es válido" };
  if (downPayment > totalAmount) return { error: "El abono no puede ser mayor al total" };

  const userId = session.user?.id;
  if (!userId) return { error: "No autorizado" };

  try {
    const reservation = await prisma.reservation.create({
      data: {
        establishmentId: session.user.establishmentId,
        guestId,
        roomId,
        checkIn,
        checkOut,
        numGuests,
        totalAmount,
        notes,
        status: "PENDING",
        source: "MANUAL",
      },
    });

    if (downPayment > 0) {
      await prisma.payment.create({
        data: {
          establishmentId: session.user.establishmentId,
          reservationId: reservation.id,
          registeredById: userId,
          amount: downPayment,
          method: downPaymentMethod,
          status: "COMPLETED",
          notes: "Abono al crear reserva",
        },
      });
    }

    revalidatePath("/dashboard/reservations");
    revalidatePath("/dashboard/pending-payments");
    revalidatePath("/dashboard/payments");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear la reserva";
    return { error: message };
  }
}

const VALID_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"] as const;

export type UpdateReservationStatusState = { error?: string; success?: boolean };

export async function updateReservationStatus(
  reservationId: string,
  status: (typeof VALID_STATUSES)[number]
): Promise<UpdateReservationStatusState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }
  if (!VALID_STATUSES.includes(status)) {
    return { error: "Estado no válido" };
  }

  try {
    const updated = await prisma.reservation.updateMany({
      where: {
        id: reservationId,
        establishmentId: session.user.establishmentId,
      },
      data: { status },
    });
    if (updated.count === 0) {
      return { error: "Reserva no encontrada" };
    }
    revalidatePath("/dashboard/reservations");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar la reserva";
    return { error: message };
  }
}

export type DeleteReservationState = { error?: string; success?: boolean };

export async function deleteReservation(reservationId: string): Promise<DeleteReservationState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({ where: { reservationId } });
      const deleted = await tx.reservation.deleteMany({
        where: {
          id: reservationId,
          establishmentId: session.user.establishmentId,
        },
      });
      if (deleted.count === 0) {
        throw new Error("Reserva no encontrada");
      }
    });
    revalidatePath("/dashboard/reservations");
    revalidatePath("/dashboard/pending-payments");
    revalidatePath("/dashboard/payments");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar la reserva";
    return { error: message };
  }
}
