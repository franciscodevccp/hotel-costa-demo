import { format, differenceInDays } from "date-fns";
import { requireAuth } from "@/lib/require-auth";
import { getReservations } from "@/lib/queries/reservations";
import { getRooms } from "@/lib/queries/rooms";
import { getGuests } from "@/lib/queries/guests";
import { AdminReservationsView } from "@/components/reservations/admin-reservations-view";
import { ReceptionistReservationsView } from "@/components/reservations/receptionist-reservations-view";
import type { Prisma } from "@prisma/client";

type ReservationWithRelations = Prisma.ReservationGetPayload<{
  include: { guest: true; room: true; payments: true };
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
      return {
        id: r.id,
        guest_name: guest.fullName,
        guest_email: guest.email ?? "",
        guest_phone: guest.phone ?? "",
        room_number: room.roomNumber,
        room_type: room.type,
        check_in: format(r.checkIn, "yyyy-MM-dd"),
        check_out: format(r.checkOut, "yyyy-MM-dd"),
        status: r.status.toLowerCase() as "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled",
        total_price: r.totalAmount,
        paid_amount: paid,
        pending_amount: Math.max(0, r.totalAmount - paid),
        nights: differenceInDays(r.checkOut, r.checkIn),
        guests: r.numGuests,
      };
    });
  const roomNumbers = rooms.map((r) => r.roomNumber).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const roomsForForm = rooms.map((r) => ({ id: r.id, roomNumber: r.roomNumber, pricePerNight: r.pricePerNight }));
  const guestsForForm = guests.map((g) => ({ id: g.id, fullName: g.fullName, email: g.email ?? "" }));

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
