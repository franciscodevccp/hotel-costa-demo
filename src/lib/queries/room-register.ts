import { prisma } from "@/lib/db";

/**
 * Registro diario de habitaciones: todas las habitaciones con la ocupación
 * correspondiente a la fecha (reserva que cubre ese día, si existe).
 */
export async function getRoomRegister(establishmentId: string, date: Date) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  const rooms = await prisma.room.findMany({
    where: { establishmentId },
    select: {
      id: true,
      roomNumber: true,
      type: true,
      pricePerNight: true,
      maxGuests: true,
    },
    orderBy: { roomNumber: "asc" },
  });

  // Orden numérico: 1, 2, 3, … 10, 11
  const sortedRooms = [...rooms].sort((a, b) => {
    const na = Number(a.roomNumber);
    const nb = Number(b.roomNumber);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
  });

  const reservations = await prisma.reservation.findMany({
    where: {
      establishmentId,
      roomId: { in: sortedRooms.map((r) => r.id) },
      status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
      checkIn: { lte: dayEnd },
      checkOut: { gt: dayStart },
    },
    include: {
      guest: {
        select: {
          fullName: true,
          type: true,
          companyName: true,
          email: true,
          phone: true,
        },
      },
      payments: {
        select: {
          amount: true,
          paidAt: true,
          method: true,
          receiptUrl: true,
          receiptUrls: true,
          receiptEntries: true,
        },
        orderBy: { paidAt: "asc" },
      },
      consumptions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const reservationByRoom = new Map(
    reservations.map((r) => [r.roomId, r])
  );

  const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: "Efectivo",
    DEBIT: "Débito",
    CREDIT: "Crédito",
    TRANSFER: "Transferencia",
    OTHER: "Otro",
  };

  return sortedRooms.map((room) => {
    const res = reservationByRoom.get(room.id);
    const paid = res?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;
    const consumptionSum = res?.consumptions.reduce((s, c) => s + c.amount, 0) ?? 0;
    const total = res != null ? (res.totalAmount ?? 0) + consumptionSum : 0;
    const balance = Math.max(0, total - paid);
    const guestLabel = res
      ? (res.guest.type === "COMPANY" && res.guest.companyName
          ? res.guest.companyName
          : res.guest.fullName)
      : null;

    const detail =
      res ?
        {
          reservationId: res.id,
          checkIn: res.checkIn,
          checkOut: res.checkOut,
          status: res.status,
          notes: res.notes ?? null,
          companyName: res.companyName ?? null,
          folioNumber: res.folioNumber ?? null,
          processedByName: (res as { processedByName?: string | null }).processedByName ?? null,
          entryCardImageUrl: res.entryCardImageUrl ?? null,
          guest: {
            fullName: res.guest.fullName,
            companyName: res.guest.companyName ?? null,
            type: res.guest.type,
            email: res.guest.email ?? null,
            phone: res.guest.phone ?? null,
          },
          payments: res.payments.map((p) => {
            const prismaPayment = p as { receiptUrl?: string | null; receiptUrls?: string[]; receiptEntries?: { url: string; amount: number; method: string }[] | null };
            const receiptUrls = prismaPayment.receiptUrls?.length
              ? prismaPayment.receiptUrls
              : prismaPayment.receiptUrl
                ? [prismaPayment.receiptUrl]
                : [];
            const receiptEntries = Array.isArray(prismaPayment.receiptEntries) ? prismaPayment.receiptEntries : null;
            return {
              amount: p.amount,
              paidAt: p.paidAt,
              method: PAYMENT_METHOD_LABELS[p.method] ?? p.method,
              receipt_urls: receiptUrls,
              receipt_entries: receiptEntries ?? undefined,
            };
          }),
          consumptions: res.consumptions.map((c) => ({
            id: c.id,
            consumptionNumber: c.consumptionNumber,
            description: c.description ?? null,
            amount: c.amount,
            method: c.method,
            cardImageUrl: c.cardImageUrl ?? null,
            createdAt: c.createdAt,
          })),
        }
      : null;

    return {
      roomId: room.id,
      roomNumber: room.roomNumber,
      type: room.type,
      pricePerNight: room.pricePerNight,
      maxGuests: room.maxGuests,
      guestName: guestLabel,
      numGuests: res?.numGuests ?? null,
      folioNumber: res?.folioNumber ?? null,
      paidAmount: res ? paid : null,
      consumptionSum: res ? consumptionSum : null,
      balance: res ? balance : null,
      totalAmount: res ? total : null,
      detail,
    };
  });
}
