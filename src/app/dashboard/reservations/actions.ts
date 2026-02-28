"use server";

import { revalidatePath } from "next/cache";
import { PaymentStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncMotopressBookings } from "@/lib/motopress-sync";
import { pushBookingToMotopress, cancelBookingInMotopress } from "@/lib/motopress-push";

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

  // Parsear como día local (evitar que "2026-02-26" se interprete como medianoche UTC = 25 feb en Chile)
  const [yIn, mIn, dIn] = checkInStr.split("-").map(Number);
  const [yOut, mOut, dOut] = checkOutStr.split("-").map(Number);
  const checkIn = new Date(yIn, mIn - 1, dIn);
  const checkOut = new Date(yOut, mOut - 1, dOut);
  if (Number.isNaN(checkIn.getTime())) return { error: "Fecha de check-in no válida" };
  if (Number.isNaN(checkOut.getTime())) return { error: "Fecha de check-out no válida" };
  if (checkIn >= checkOut) return { error: "El check-out debe ser posterior al check-in" };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (checkIn < todayStart) return { error: "El check-in no puede ser una fecha anterior a hoy" };

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
    const guest = await prisma.guest.findUnique({
      where: { id: guestId, establishmentId: session.user.establishmentId },
      select: { type: true, companyName: true, companyRut: true, companyEmail: true },
    });
    const companyData =
      guest?.type === "COMPANY" && guest.companyName
        ? {
            companyName: guest.companyName,
            companyRut: guest.companyRut ?? null,
            companyEmail: guest.companyEmail ?? null,
          }
        : {};

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
        ...companyData,
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
          status: downPayment >= totalAmount ? PaymentStatus.COMPLETED : PaymentStatus.PARTIAL,
          notes: "Abono al crear reserva",
        },
      });
    }

    // Enviar a MotoPress para bloquear fechas en la web (no fallar la creación si el push falla)
    try {
      const [room, guest] = await Promise.all([
        prisma.room.findUnique({ where: { id: roomId }, select: { externalId: true } }),
        prisma.guest.findUnique({ where: { id: guestId }, select: { fullName: true, email: true, phone: true } }),
      ]);
      if (room?.externalId && guest?.email) {
        const parts = (guest.fullName || "Huésped").trim().split(/\s+/);
        const guestFirstName = parts[0] ?? "Huésped";
        const guestLastName = parts.slice(1).join(" ") || guestFirstName;
        const motopressId = await pushBookingToMotopress({
          accommodationExternalId: room.externalId,
          checkIn,
          checkOut,
          adults: numGuests,
          children: 0,
          guestFirstName,
          guestLastName,
          guestEmail: guest.email,
          guestPhone: guest.phone ?? undefined,
          note: notes ?? undefined,
        });
        if (motopressId) {
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: { motopressId, syncedAt: new Date() },
          });
        }
      }
    } catch (_) {
      // La reserva ya se creó; si falla el push a la web no bloqueamos ni duplicamos
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

export type CreateReservationsBulkState = { error?: string; success?: boolean; created?: number };

/** Crea varias reservas a la vez (mismo huésped, mismas fechas): una por habitación, cada una con su número de huéspedes. */
export async function createReservationsBulk(payload: {
  guestId: string;
  checkIn: string;
  checkOut: string;
  rooms: Array<{ roomId: string; numGuests: number }>;
  downPayment: number;
  downPaymentMethod: string;
  paymentTermDays?: number | null;
  notes?: string | null;
  customTotalAmount?: number | null;
  /** Número de folio / tarjeta de ingreso (obligatorio) */
  folioNumber: string;
  /** Nombre del recepcionista/trabajador que gestiona la reserva (obligatorio) */
  processedByName: string;
}): Promise<CreateReservationsBulkState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  const { guestId, checkIn: checkInStr, checkOut: checkOutStr, rooms: roomLines, downPayment, downPaymentMethod, paymentTermDays, notes, customTotalAmount, folioNumber, processedByName } = payload;
  const folioTrim = folioNumber?.trim() ?? "";
  if (!folioTrim) return { error: "El número de folio (tarjeta de ingreso) es obligatorio" };
  const nameTrim = processedByName?.trim() ?? "";
  if (!nameTrim) return { error: "Indique el nombre del recepcionista que gestiona la reserva" };
  const isPurchaseOrder = downPaymentMethod === "PURCHASE_ORDER";
  if (isPurchaseOrder && (!paymentTermDays || paymentTermDays < 1)) {
    return { error: "Indique los días hábiles para pagar (orden de compra)" };
  }

  if (!guestId) return { error: "Seleccione un huésped" };
  if (!roomLines?.length) return { error: "Agregue al menos una habitación" };

  const validLines = roomLines.filter((l) => l.roomId && l.numGuests >= 1);
  if (validLines.length === 0) return { error: "Cada habitación debe tener al menos 1 huésped" };

  const [yIn, mIn, dIn] = checkInStr.split("-").map(Number);
  const [yOut, mOut, dOut] = checkOutStr.split("-").map(Number);
  const checkIn = new Date(yIn, mIn - 1, dIn);
  const checkOut = new Date(yOut, mOut - 1, dOut);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    return { error: "Fechas no válidas" };
  }
  if (checkIn >= checkOut) return { error: "El check-out debe ser posterior al check-in" };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (checkIn < todayStart) return { error: "El check-in no puede ser anterior a hoy" };

  const VALID_PAYMENT_METHODS = ["CASH", "DEBIT", "CREDIT", "TRANSFER", "OTHER"] as const;
  const method = VALID_PAYMENT_METHODS.includes(payload.downPaymentMethod as (typeof VALID_PAYMENT_METHODS)[number])
    ? (payload.downPaymentMethod as (typeof VALID_PAYMENT_METHODS)[number])
    : "OTHER";

  const userId = session.user?.id;
  if (!userId) return { error: "No autorizado" };

  const establishmentId = session.user.establishmentId;

  try {
    const roomIds = validLines.map((l) => l.roomId);
    const roomsFromDb = await prisma.room.findMany({
      where: { id: { in: roomIds }, establishmentId },
      select: { id: true, pricePerNight: true, externalId: true },
    });
    const roomMap = new Map(roomsFromDb.map((r) => [r.id, r]));
    const nights = Math.max(0, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

    const guest = await prisma.guest.findUnique({
      where: { id: guestId, establishmentId },
      select: { fullName: true, email: true, phone: true, type: true, companyName: true, companyRut: true, companyEmail: true },
    });
    if (!guest) return { error: "Huésped no encontrado" };

    const companyData =
      guest.type === "COMPANY" && guest.companyName
        ? {
            companyName: guest.companyName,
            companyRut: guest.companyRut ?? null,
            companyEmail: guest.companyEmail ?? null,
          }
        : {};
    const paymentTermData =
      isPurchaseOrder && paymentTermDays != null && paymentTermDays >= 1 ? { paymentTermDays } : {};

    let downPaymentRemaining = Math.max(0, downPayment);
    let created = 0;

    for (let i = 0; i < validLines.length; i++) {
      const line = validLines[i];
      const room = roomMap.get(line.roomId);
      if (!room) continue;
      const calculatedTotal = room.pricePerNight * nights;
      const totalAmount =
        validLines.length === 1 &&
        customTotalAmount != null &&
        customTotalAmount > 0
          ? customTotalAmount
          : calculatedTotal;

      const reservation = await prisma.reservation.create({
        data: {
          establishmentId,
          guestId,
          roomId: line.roomId,
          checkIn,
          checkOut,
          numGuests: Math.min(10, Math.max(1, line.numGuests)),
          totalAmount,
          notes: notes?.trim() || null,
          status: "PENDING",
          source: "MANUAL",
          folioNumber: folioTrim,
          processedByName: nameTrim,
          ...companyData,
          ...paymentTermData,
        },
      });
      created += 1;

      const amountForThis = Math.min(downPaymentRemaining, totalAmount);
      if (amountForThis > 0) {
        await prisma.payment.create({
          data: {
            establishmentId,
            reservationId: reservation.id,
            registeredById: userId,
            amount: amountForThis,
            method: isPurchaseOrder ? "OTHER" : method,
            status: amountForThis >= totalAmount ? PaymentStatus.COMPLETED : PaymentStatus.PARTIAL,
            notes: "Abono al crear reserva",
          },
        });
        downPaymentRemaining -= amountForThis;
      }

      try {
        if (room.externalId && guest.email) {
          const parts = (guest.fullName || "Huésped").trim().split(/\s+/);
          const guestFirstName = parts[0] ?? "Huésped";
          const guestLastName = parts.slice(1).join(" ") || guestFirstName;
          const motopressId = await pushBookingToMotopress({
            accommodationExternalId: room.externalId,
            checkIn,
            checkOut,
            adults: line.numGuests,
            children: 0,
            guestFirstName,
            guestLastName,
            guestEmail: guest.email,
            guestPhone: guest.phone ?? undefined,
            note: notes ?? undefined,
          });
          if (motopressId) {
            await prisma.reservation.update({
              where: { id: reservation.id },
              data: { motopressId, syncedAt: new Date() },
            });
          }
        }
      } catch (_) {
        // no bloquear creación si falla push
      }
    }

    revalidatePath("/dashboard/reservations");
    revalidatePath("/dashboard/pending-payments");
    revalidatePath("/dashboard/payments");
    return { success: true, created };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear las reservas";
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
    if (status === "CANCELLED") {
      const reservation = await prisma.reservation.findFirst({
        where: { id: reservationId, establishmentId: session.user.establishmentId },
        select: { motopressId: true },
      });
      if (reservation?.motopressId) {
        await cancelBookingInMotopress(reservation.motopressId);
      }
    }
    const now = new Date();
    const data: { status: (typeof VALID_STATUSES)[number]; checkedInAt?: Date; checkedOutAt?: Date } = { status };
    if (status === "CHECKED_IN") data.checkedInAt = now;
    if (status === "CHECKED_OUT") data.checkedOutAt = now;

    const updated = await prisma.reservation.updateMany({
      where: {
        id: reservationId,
        establishmentId: session.user.establishmentId,
      },
      data,
    });
    if (updated.count === 0) {
      return { error: "Reserva no encontrada" };
    }
    revalidatePath("/dashboard/reservations");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar la reserva";
    return { error: message };
  }
}

export type UpdateEntryCardState = { error?: string; success?: boolean };

export async function updateReservationEntryCard(
  reservationId: string,
  entryCardImageUrl: string
): Promise<UpdateEntryCardState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }
  try {
    const updated = await prisma.reservation.updateMany({
      where: {
        id: reservationId,
        establishmentId: session.user.establishmentId,
      },
      data: { entryCardImageUrl },
    });
    if (updated.count === 0) return { error: "Reserva no encontrada" };
    revalidatePath("/dashboard/reservations");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al guardar la foto";
    return { error: message };
  }
}

export type DeleteReservationState = { error?: string; success?: boolean };

export async function deleteReservation(reservationId: string): Promise<DeleteReservationState> {
  try {
    const session = await auth();
    if (!session?.user?.establishmentId) {
      return { error: "No autorizado" };
    }

    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, establishmentId: session.user.establishmentId },
      select: { motopressId: true },
    });
    if (reservation?.motopressId) {
      try {
        await cancelBookingInMotopress(reservation.motopressId);
      } catch {
        // Si falla cancelar en MotoPress, igual eliminamos la reserva local
      }
    }
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
    // No usar revalidatePath aquí: en producción puede disparar un re-render que falla.
    // El cliente hace router.refresh() y obtiene datos frescos del servidor.
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar la reserva";
    return { error: message };
  }
}

export type SyncMotopressState =
  | { success: true; reservationsFound: number; reservationsCreated: number; reservationsSkipped: number }
  | { success: false; error: string };

export async function syncMotopressReservations(): Promise<SyncMotopressState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { success: false, error: "No autorizado" };
  }
  try {
    const result = await syncMotopressBookings();
    if (!result.success) {
      return { success: false, error: result.error ?? "Error en la sincronización" };
    }
    revalidatePath("/dashboard/reservations");
    return {
      success: true,
      reservationsFound: result.reservationsFound,
      reservationsCreated: result.reservationsCreated,
      reservationsSkipped: result.reservationsSkipped,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al sincronizar con MotoPress";
    return { success: false, error: message };
  }
}
