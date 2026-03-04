import type { UserRole } from "@/lib/types/database";
import { requireAuth } from "@/lib/require-auth";
import { getPayments } from "@/lib/queries/payments";
import { getAllPendingReservations } from "@/lib/queries/pending-payments";
import { getReservationById } from "@/lib/queries/reservations";
import { AdminPaymentsView } from "@/components/payments/admin-payments-view";
import { ReceptionistPaymentsView } from "@/components/payments/receptionist-payments-view";

type SearchParams = Promise<{ reservation?: string }> | { reservation?: string };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireAuth();
  const params = await Promise.resolve(searchParams ?? {}).then((p) => p ?? {});
  const openReservationId = params.reservation ?? undefined;
  const userRole: UserRole = session.user.role === "ADMIN" ? "admin" : "receptionist";
  const [raw, pendingReservations, reservationForPayment] = await Promise.all([
    getPayments(session.user.establishmentId),
    getAllPendingReservations(session.user.establishmentId),
    openReservationId
      ? getReservationById(session.user.establishmentId, openReservationId)
      : Promise.resolve(null),
  ]);
  const paidByReservation = new Map<string, number>();
  for (const p of raw) {
    paidByReservation.set(p.reservationId, (paidByReservation.get(p.reservationId) ?? 0) + p.amount);
  }
  const payments = raw.map((p) => {
    const consumptionSum = p.reservation.consumptions?.reduce((s, c) => s + c.amount, 0) ?? 0;
    const totalToPay = p.reservation.totalAmount + consumptionSum;
    const reservationPaidAmount = paidByReservation.get(p.reservationId) ?? 0;
    return {
      id: p.id,
      reservation_id: p.reservationId,
      paid_at: p.paidAt.toISOString(),
      guest_name: p.reservation.guest.fullName,
      guest_type: p.reservation.guest.type,
      room_number: p.reservation.room.roomNumber,
      amount: p.amount,
      total_amount: totalToPay,
      reservation_paid_amount: reservationPaidAmount,
      method: p.method.toLowerCase() as "cash" | "debit" | "credit" | "transfer" | "other",
      additional_methods: (p.additionalMethods ?? []).map(
        (m) => m.toLowerCase() as "cash" | "debit" | "credit" | "transfer" | "other"
      ),
      status: p.status.toLowerCase() as "completed" | "partial" | "pending" | "refunded",
      registered_by: p.registeredBy.fullName,
      reservation_status: p.reservation.status.toLowerCase() as "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show",
    };
  });

  const reservationPayload =
    reservationForPayment && reservationForPayment.payments.length === 0
      ? (() => {
          const consumptionSum =
            reservationForPayment.consumptions?.reduce((s, c) => s + c.amount, 0) ?? 0;
          const totalToPay = reservationForPayment.totalAmount + consumptionSum;
          return {
            reservationId: reservationForPayment.id,
            guestName: reservationForPayment.guest.fullName,
            roomNumber: reservationForPayment.room.roomNumber,
            totalAmount: totalToPay,
          };
        })()
      : undefined;

  return (
    <div className="p-6">
      {userRole === "admin" && (
        <AdminPaymentsView
          payments={payments}
          pendingReservations={pendingReservations}
          openReservationId={openReservationId}
          reservationForFirstPayment={reservationPayload}
        />
      )}
      {userRole === "receptionist" && (
        <ReceptionistPaymentsView
          payments={payments}
          pendingReservations={pendingReservations}
          openReservationId={openReservationId}
          reservationForFirstPayment={reservationPayload}
        />
      )}
    </div>
  );
}
