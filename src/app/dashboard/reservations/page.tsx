import { format, differenceInDays } from "date-fns";
import { requireAuth } from "@/lib/require-auth";
import { getReservations } from "@/lib/queries/reservations";
import { getRooms } from "@/lib/queries/rooms";
import { getGuests } from "@/lib/queries/guests";
import { AdminReservationsView } from "@/components/reservations/admin-reservations-view";
import { ReceptionistReservationsView } from "@/components/reservations/receptionist-reservations-view";
import type { Prisma } from "@prisma/client";
import { extractReservationGroupId } from "@/lib/reservation-groups";

type ReservationWithRelations = Prisma.ReservationGetPayload<{
  include: { guest: true; room: true; payments: true; processedBy: { select: { id: true; fullName: true } } };
}>;

export default async function ReservationsPage() {
  const session = await requireAuth();
  const [raw, rooms, guests] = await Promise.all([
    getReservations(session.user.establishmentId) as Promise<ReservationWithRelations[]>,
    getRooms(session.user.establishmentId),
    getGuests(session.user.establishmentId),
  ]);
  const normalized = raw
    .filter((r) => r.guest != null && r.room != null)
    .map((r) => {
      const guest = r.guest!;
      const room = r.room!;
      const paid = r.payments.reduce((s, p) => s + p.amount, 0);
      const consumptions = (r as { consumptions?: { id: string; consumptionNumber: string; description: string | null; amount: number; method: string; cardImageUrl: string | null; createdAt: Date }[] }).consumptions ?? [];
      const consumptionSum = consumptions.reduce((s, c) => s + c.amount, 0);
      const totalToPay = r.totalAmount + consumptionSum;
      return {
        id: r.id,
        group_key: extractReservationGroupId((r as { notes?: string | null }).notes ?? null) ?? undefined,
        guest_name: guest.fullName,
        guest_email: guest.email ?? "",
        guest_phone: guest.phone ?? "",
        guest_type: guest.type,
        room_id: r.roomId,
        room_number: room.roomNumber,
        room_type: room.type,
        check_in: format(r.checkIn, "yyyy-MM-dd"),
        check_out: format(r.checkOut, "yyyy-MM-dd"),
        status: r.status.toLowerCase() as "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show",
        total_price: totalToPay,
        paid_amount: paid,
        pending_amount: Math.max(0, totalToPay - paid),
        nights: Math.max(1, differenceInDays(r.checkOut, r.checkIn)),
        guests: r.numGuests,
        payment_term_days: r.paymentTermDays ?? undefined,
        folio_number: r.folioNumber ?? undefined,
        processed_by_name: (r as { processedByName?: string | null }).processedByName ?? r.processedBy?.fullName ?? undefined,
        entry_card_image_url: r.entryCardImageUrl ?? undefined,
        consumptions: consumptions.map((c) => ({
          id: c.id,
          consumption_number: c.consumptionNumber,
          description: c.description ?? undefined,
          amount: c.amount,
          method: c.method,
          card_image_url: c.cardImageUrl ?? undefined,
          created_at: format(c.createdAt, "yyyy-MM-dd"),
        })),
        payments: r.payments.map((p) => {
          const prismaPayment = p as { receiptUrl?: string | null; receiptUrls?: string[]; receiptEntries?: { url: string; amount: number; method: string }[] | null };
          const receiptUrls = prismaPayment.receiptUrls?.length
            ? prismaPayment.receiptUrls
            : prismaPayment.receiptUrl
              ? [prismaPayment.receiptUrl]
              : [];
          const receipt_entries = Array.isArray(prismaPayment.receiptEntries) ? prismaPayment.receiptEntries : null;
          return {
            id: p.id,
            amount: p.amount,
            method: p.method,
            paid_at: format(p.paidAt, "yyyy-MM-dd"),
            receipt_url: prismaPayment.receiptUrl ?? undefined,
            receipt_urls: receiptUrls,
            receipt_entries: receipt_entries ?? undefined,
          };
        }),
      } as const;
    });
  const groupedMap = new Map<string, (typeof normalized)[number][]>();
  for (const r of normalized) {
    const key = r.group_key ? `grp:${r.group_key}` : `single:${r.id}`;
    const list = groupedMap.get(key) ?? [];
    list.push(r);
    groupedMap.set(key, list);
  }
  const reservations = Array.from(groupedMap.values()).map((rows) => {
    if (rows.length === 1) return rows[0];
    const first = rows[0];
    const roomNumbersGrouped = rows.map((x) => x.room_number).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const total = rows.reduce((s, x) => s + x.total_price, 0);
    const paid = rows.reduce((s, x) => s + (x.paid_amount ?? 0), 0);
    const pending = Math.max(0, total - paid);
    const guests = rows.reduce((s, x) => s + x.guests, 0);
    const payments = rows.flatMap((x) => x.payments ?? []);
    const consumptions = rows.flatMap((x) => x.consumptions ?? []);
    return {
      ...first,
      room_number: roomNumbersGrouped.join(", "),
      room_id: first.room_id,
      room_type: "MULTIROOM",
      total_price: total,
      paid_amount: paid,
      pending_amount: pending,
      guests,
      payments,
      consumptions,
      grouped_room_count: rows.length,
      grouped_room_numbers: roomNumbersGrouped,
    };
  });
  const roomNumbers = rooms.map((r) => r.roomNumber).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const roomsForForm = rooms.map((r) => ({ id: r.id, roomNumber: r.roomNumber, pricePerNight: r.pricePerNight }));
  const guestsForForm = guests.map((g) => ({
    id: g.id,
    fullName: g.fullName,
    email: g.email ?? "",
    type: g.type,
  }));
  return (
    <div className="p-6">
      {session.user.role === "ADMIN" && (
        <AdminReservationsView
          reservations={reservations}
          roomNumbers={roomNumbers}
          rooms={roomsForForm}
          guests={guestsForForm}
        />
      )}
      {session.user.role === "RECEPTIONIST" && (
        <ReceptionistReservationsView
          reservations={reservations}
          roomNumbers={roomNumbers}
          rooms={roomsForForm}
          guests={guestsForForm}
        />
      )}
    </div>
  );
}
