"use server";

import { revalidatePath } from "next/cache";
import { PaymentStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncMotopressBookings } from "@/lib/motopress-sync";
import { pushBookingToMotopress, cancelBookingInMotopress, updateBookingDatesInMotopress, updateBookingRoomInMotopress } from "@/lib/motopress-push";

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
  if (checkOut < checkIn) return { error: "El check-out no puede ser anterior al check-in" };

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
      (guest?.type === "COMPANY" || guest?.type === "DELEGACION") && guest.companyName
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
  /** URL del comprobante de pago (cuando método es transferencia/débito/crédito/otro) */
  downPaymentReceiptUrl?: string | null;
  /** Hash del comprobante (para detectar imagen duplicada si luego suben el mismo en Pagos) */
  downPaymentReceiptHash?: string | null;
}): Promise<CreateReservationsBulkState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  const { guestId, checkIn: checkInStr, checkOut: checkOutStr, rooms: roomLines, downPayment, downPaymentMethod, paymentTermDays, notes, customTotalAmount, folioNumber, processedByName, downPaymentReceiptUrl, downPaymentReceiptHash } = payload;
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
  if (checkOut < checkIn) return { error: "El check-out no puede ser anterior al check-in" };

  const VALID_PAYMENT_METHODS = ["CASH", "DEBIT", "CREDIT", "TRANSFER", "OTHER"] as const;
  const method = VALID_PAYMENT_METHODS.includes(payload.downPaymentMethod as (typeof VALID_PAYMENT_METHODS)[number])
    ? (payload.downPaymentMethod as (typeof VALID_PAYMENT_METHODS)[number])
    : "OTHER";

  const requiresReceipt = !isPurchaseOrder && method !== "CASH" && downPayment > 0;
  if (requiresReceipt && !(downPaymentReceiptUrl?.trim())) {
    return { error: "Debe subir el comprobante de pago cuando el método es transferencia, débito, crédito u otro." };
  }

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
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

    const guest = await prisma.guest.findUnique({
      where: { id: guestId, establishmentId },
      select: { fullName: true, email: true, phone: true, type: true, companyName: true, companyRut: true, companyEmail: true },
    });
    if (!guest) return { error: "Huésped no encontrado" };

    const companyData =
      (guest.type === "COMPANY" || guest.type === "DELEGACION") && guest.companyName
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
        const isFirstPayment = downPaymentRemaining === downPayment;
        const receiptUrls = isFirstPayment && downPaymentReceiptUrl ? [downPaymentReceiptUrl] : [];
        const receiptEntries =
          isFirstPayment && downPaymentReceiptUrl
            ? [{ url: downPaymentReceiptUrl, amount: amountForThis, method: isPurchaseOrder ? "OTHER" : method, hash: downPaymentReceiptHash ?? undefined }]
            : undefined;
        await prisma.payment.create({
          data: {
            establishmentId,
            reservationId: reservation.id,
            registeredById: userId,
            amount: amountForThis,
            method: isPurchaseOrder ? "OTHER" : method,
            status: amountForThis >= totalAmount ? PaymentStatus.COMPLETED : PaymentStatus.PARTIAL,
            notes: "Abono al crear reserva",
            receiptUrl: isFirstPayment ? (downPaymentReceiptUrl ?? null) : null,
            receiptUrls,
            ...(receiptEntries && { receiptEntries }),
          } as Parameters<typeof prisma.payment.create>[0]["data"],
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

export type UpdateReservationDatesState = { error?: string; success?: boolean };

/** Cambiar las fechas de check-in y check-out de una reserva existente. Comprueba que la habitación siga disponible. */
export async function updateReservationDates(
  reservationId: string,
  checkInStr: string,
  checkOutStr: string
): Promise<UpdateReservationDatesState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  const establishmentId = session.user.establishmentId;
  const [yIn, mIn, dIn] = (checkInStr ?? "").split("-").map(Number);
  const [yOut, mOut, dOut] = (checkOutStr ?? "").split("-").map(Number);
  if (Number.isNaN(yIn) || Number.isNaN(mIn) || Number.isNaN(dIn) || Number.isNaN(yOut) || Number.isNaN(mOut) || Number.isNaN(dOut)) {
    return { error: "Fechas no válidas" };
  }

  const newCheckIn = new Date(yIn, mIn - 1, dIn);
  const newCheckOut = new Date(yOut, mOut - 1, dOut);
  if (newCheckOut < newCheckIn) {
    return { error: "El check-out no puede ser anterior al check-in" };
  }

  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, establishmentId },
    select: { id: true, roomId: true, status: true, motopressId: true },
  });
  if (!reservation) return { error: "Reserva no encontrada" };

  const activeStatuses = ["PENDING", "CONFIRMED", "CHECKED_IN"] as const;
  if (!activeStatuses.includes(reservation.status as (typeof activeStatuses)[number])) {
    return { error: "Solo se pueden cambiar fechas en reservas pendientes, confirmadas o con check-in realizado" };
  }

  const otherInSameRoom = await prisma.reservation.findMany({
    where: {
      establishmentId,
      roomId: reservation.roomId,
      id: { not: reservationId },
      status: { notIn: ["CANCELLED", "NO_SHOW", "CHECKED_OUT"] },
    },
    select: { checkIn: true, checkOut: true, status: true },
  });

  for (const other of otherInSameRoom) {
    const otherStart = other.checkIn.getTime();
    const otherEnd = other.checkOut.getTime();
    const newStart = newCheckIn.getTime();
    const newEnd = newCheckOut.getTime();
    const overlap = otherStart < newEnd && (other.status === "CHECKED_OUT" ? otherEnd > newStart : otherEnd >= newStart);
    if (overlap) {
      return { error: "La habitación no está disponible en las fechas elegidas" };
    }
  }

  const checkInDate = new Date(newCheckIn.getFullYear(), newCheckIn.getMonth(), newCheckIn.getDate(), 0, 0, 0, 0);
  const checkOutDate = new Date(newCheckOut.getFullYear(), newCheckOut.getMonth(), newCheckOut.getDate(), 0, 0, 0, 0);

  await prisma.reservation.updateMany({
    where: { id: reservationId, establishmentId },
    data: { checkIn: checkInDate, checkOut: checkOutDate },
  });

  if (reservation.motopressId) {
    try {
      await updateBookingDatesInMotopress(reservation.motopressId, checkInDate, checkOutDate);
    } catch {
      // No fallar la acción: las fechas ya se actualizaron en MiHostal; la web se puede corregir después
    }
  }

  revalidatePath("/dashboard/reservations");
  revalidatePath("/dashboard");
  return { success: true };
}

export type UpdateReservationRoomState = { error?: string; success?: boolean };

/** Cambiar la habitación de una reserva existente. Comprueba que la nueva habitación esté libre en las fechas de la reserva. */
export async function updateReservationRoom(
  reservationId: string,
  newRoomId: string
): Promise<UpdateReservationRoomState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }
  const establishmentId = session.user.establishmentId;

  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, establishmentId },
    select: { id: true, roomId: true, checkIn: true, checkOut: true, status: true, motopressId: true, numGuests: true },
  });
  if (!reservation) return { error: "Reserva no encontrada" };

  const activeStatuses = ["PENDING", "CONFIRMED", "CHECKED_IN"] as const;
  if (!activeStatuses.includes(reservation.status as (typeof activeStatuses)[number])) {
    return { error: "Solo se puede cambiar la habitación en reservas pendientes, confirmadas o con check-in realizado" };
  }

  if (newRoomId === reservation.roomId) {
    return { error: "La habitación seleccionada es la misma" };
  }

  const newRoom = await prisma.room.findFirst({
    where: { id: newRoomId, establishmentId },
    select: { id: true, externalId: true },
  });
  if (!newRoom) return { error: "Habitación no encontrada" };

  const checkIn = reservation.checkIn;
  const checkOut = reservation.checkOut;

  const otherInNewRoom = await prisma.reservation.findMany({
    where: {
      establishmentId,
      roomId: newRoomId,
      id: { not: reservationId },
      status: { notIn: ["CANCELLED", "NO_SHOW", "CHECKED_OUT"] },
    },
    select: { checkIn: true, checkOut: true, status: true },
  });

  for (const other of otherInNewRoom) {
    const otherStart = other.checkIn.getTime();
    const otherEnd = other.checkOut.getTime();
    const resStart = checkIn.getTime();
    const resEnd = checkOut.getTime();
    const overlap = otherStart < resEnd && (other.status === "CHECKED_OUT" ? otherEnd > resStart : otherEnd >= resStart);
    if (overlap) {
      return { error: "La habitación no está disponible en las fechas de esta reserva" };
    }
  }

  await prisma.reservation.updateMany({
    where: { id: reservationId, establishmentId },
    data: { roomId: newRoomId },
  });

  if (reservation.motopressId && newRoom.externalId) {
    try {
      await updateBookingRoomInMotopress(reservation.motopressId, newRoom.externalId, reservation.numGuests);
    } catch {
      // No fallar: la habitación ya se actualizó en MiHostal
    }
  }

  revalidatePath("/dashboard/reservations");
  revalidatePath("/dashboard");
  return { success: true };
}

export type UpdateReservationTotalState = { error?: string; success?: boolean };

/** Modificar el monto total de una reserva ya creada (ej. al cambiar a una habitación más cara). */
export async function updateReservationTotal(
  reservationId: string,
  newTotalAmount: number
): Promise<UpdateReservationTotalState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }
  const amount = Math.round(Number(newTotalAmount)) || 0;
  if (amount < 0) return { error: "El monto total debe ser mayor o igual a 0" };

  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, establishmentId: session.user.establishmentId },
    select: { id: true, status: true },
  });
  if (!reservation) return { error: "Reserva no encontrada" };

  const activeStatuses = ["PENDING", "CONFIRMED", "CHECKED_IN"] as const;
  if (!activeStatuses.includes(reservation.status as (typeof activeStatuses)[number])) {
    return { error: "Solo se puede modificar el total en reservas pendientes, confirmadas o con check-in realizado" };
  }

  await prisma.reservation.updateMany({
    where: { id: reservationId, establishmentId: session.user.establishmentId },
    data: { totalAmount: amount },
  });

  revalidatePath("/dashboard/reservations");
  revalidatePath("/dashboard/pending-payments");
  revalidatePath("/dashboard/payments");
  return { success: true };
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

export type CreateConsumptionState = { error?: string; success?: boolean };

export async function createConsumption(
  reservationId: string,
  data: {
    consumptionNumber: string;
    description?: string | null;
    amount: number;
    method: "CASH" | "DEBIT" | "CREDIT" | "TRANSFER" | "OTHER";
    cardImageUrl?: string | null;
  }
): Promise<CreateConsumptionState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }
  const num = data.consumptionNumber?.trim();
  if (!num) return { error: "Indique el número de consumo" };
  const amount = Math.round(Number(data.amount)) || 0;
  if (amount < 0) return { error: "El monto debe ser mayor o igual a 0" };
  try {
    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, establishmentId: session.user.establishmentId },
    });
    if (!reservation) return { error: "Reserva no encontrada" };
    await prisma.consumption.create({
      data: {
        reservationId,
        consumptionNumber: num,
        description: data.description?.trim() || null,
        amount,
        method: data.method,
        cardImageUrl: data.cardImageUrl || null,
      },
    });
    revalidatePath("/dashboard/reservations");
    revalidatePath("/dashboard/room-register");
    revalidatePath("/dashboard/pending-payments");
    revalidatePath("/dashboard/payments");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear el consumo";
    return { error: message };
  }
}

export type UpdateConsumptionCardImageState = { error?: string; success?: boolean };

export async function updateConsumptionCardImage(
  consumptionId: string,
  cardImageUrl: string
): Promise<UpdateConsumptionCardImageState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }
  try {
    const consumption = await prisma.consumption.findFirst({
      where: { id: consumptionId },
      include: { reservation: { select: { establishmentId: true } } },
    });
    if (!consumption || consumption.reservation.establishmentId !== session.user.establishmentId) {
      return { error: "Consumo no encontrado" };
    }
    await prisma.consumption.update({
      where: { id: consumptionId },
      data: { cardImageUrl },
    });
    revalidatePath("/dashboard/reservations");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al guardar la foto";
    return { error: message };
  }
}

export type DeleteConsumptionState = { error?: string; success?: boolean };

export async function deleteConsumption(consumptionId: string): Promise<DeleteConsumptionState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }
  try {
    const consumption = await prisma.consumption.findFirst({
      where: { id: consumptionId },
      include: { reservation: { select: { establishmentId: true } } },
    });
    if (!consumption || consumption.reservation.establishmentId !== session.user.establishmentId) {
      return { error: "Consumo no encontrado" };
    }
    await prisma.consumption.delete({ where: { id: consumptionId } });
    revalidatePath("/dashboard/reservations");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar el consumo";
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
      // Guardar en lista de ignoradas para que al sincronizar de nuevo no vuelva a aparecer
      if (reservation?.motopressId) {
        await tx.motopressIgnoredBooking.upsert({
          where: {
            establishmentId_motopressId: {
              establishmentId: session.user.establishmentId,
              motopressId: reservation.motopressId,
            },
          },
          create: {
            establishmentId: session.user.establishmentId,
            motopressId: reservation.motopressId,
          },
          update: {},
        });
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
  | {
      success: true;
      reservationsFound: number;
      reservationsCreated: number;
      reservationsSkipped: number;
      reservationsAlreadyInSystem?: number;
      reservationsIgnoredByUser?: number;
      reservationsFilteredOut?: number;
    }
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
      ...(result.reservationsAlreadyInSystem != null && { reservationsAlreadyInSystem: result.reservationsAlreadyInSystem }),
      ...(result.reservationsIgnoredByUser != null && { reservationsIgnoredByUser: result.reservationsIgnoredByUser }),
      ...(result.reservationsFilteredOut != null && { reservationsFilteredOut: result.reservationsFilteredOut }),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al sincronizar con MotoPress";
    return { success: false, error: message };
  }
}
