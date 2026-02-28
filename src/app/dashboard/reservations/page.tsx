import { format, differenceInDays } from "date-fns";
import { requireAuth } from "@/lib/require-auth";
import { getReservations } from "@/lib/queries/reservations";
import { getRooms } from "@/lib/queries/rooms";
import { getGuests } from "@/lib/queries/guests";
import { AdminReservationsView } from "@/components/reservations/admin-reservations-view";
import { ReceptionistReservationsView } from "@/components/reservations/receptionist-reservations-view";
import type { Prisma } from "@prisma/client";

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
  const reservations = raw
    .filter((r) => r.guest != null && r.room != null)
    .map((r) => {
      const guest = r.guest!;
      const room = r.room!;
      const paid = r.payments.reduce((s, p) => s + p.amount, 0);
      const consumptions = (r as { consumptions?: { id: string; consumptionNumber: string; description: string | null; amount: number; method: string; cardImageUrl: string | null; createdAt: Date }[] }).consumptions ?? [];
      return {
        id: r.id,
        guest_name: guest.fullName,
        guest_email: guest.email ?? "",
        guest_phone: guest.phone ?? "",
        guest_type: guest.type,
        room_number: room.roomNumber,
        room_type: room.type,
        check_in: format(r.checkIn, "yyyy-MM-dd"),
        check_out: format(r.checkOut, "yyyy-MM-dd"),
        status: r.status.toLowerCase() as "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show",
        total_price: r.totalAmount,
        paid_amount: paid,
        pending_amount: Math.max(0, r.totalAmount - paid),
        nights: differenceInDays(r.checkOut, r.checkIn),
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
