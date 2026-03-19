import type { UserRole } from "@/lib/types/database";
import { requireAuth } from "@/lib/require-auth";
import { getPayments } from "@/lib/queries/payments";
import { getAllPendingReservations } from "@/lib/queries/pending-payments";
import { getReservationById } from "@/lib/queries/reservations";
import { AdminPaymentsView } from "@/components/payments/admin-payments-view";
import { ReceptionistPaymentsView } from "@/components/payments/receptionist-payments-view";
import { extractReservationGroupId } from "@/lib/reservation-groups";

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
  // Total a pagar = habitación + consumos; así el saldo pendiente coincide con la página "Pagos pendientes".
  // El estado mostrado se calcula por total vs abonado, no por el valor guardado, para que coincida con "Pagos pendientes" (ej. si antes el total no incluía consumos y quedó COMPLETED en BD).
  const paymentsRaw = raw.map((p) => {
    const consumptionSum = (p.reservation.consumptions ?? []).reduce((s, c) => s + (c?.amount ?? 0), 0);
    const totalToPay = (p.reservation.totalAmount ?? 0) + consumptionSum;
    const reservationPaidAmount = paidByReservation.get(p.reservationId) ?? 0;
    const hasPending = reservationPaidAmount < totalToPay;
    const displayStatus: "completed" | "partial" | "pending" | "refunded" =
      (p.status as string) === "REFUNDED"
        ? "refunded"
        : hasPending
          ? reservationPaidAmount > 0
            ? "partial"
            : "pending"
          : "completed";
    const groupedReservationId = p.reservation.groupId
      ? `group:${p.reservation.groupId}`
      : (() => {
          const legacy = extractReservationGroupId((p.reservation as { notes?: string | null }).notes ?? null);
          return legacy ? `group:${legacy}` : p.reservationId;
        })();
    const roomNumber = p.reservation.room.roomNumber;
    return {
      id: p.id,
      reservation_id: groupedReservationId,
      paid_at: p.paidAt.toISOString(),
      guest_name: p.reservation.guest.fullName,
      guest_type: p.reservation.guest.type,
      room_number: roomNumber,
      amount: p.amount,
      total_amount: totalToPay,
      reservation_paid_amount: reservationPaidAmount,
      method: p.method.toLowerCase() as "cash" | "debit" | "credit" | "transfer" | "other",
      additional_methods: (p.additionalMethods ?? []).map(
        (m) => m.toLowerCase() as "cash" | "debit" | "credit" | "transfer" | "other"
      ),
      status: displayStatus,
      registered_by: p.registeredBy.fullName,
      reservation_status: p.reservation.status.toLowerCase() as "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show",
    };
  });
  const paymentsGroupedMap = new Map<string, (typeof paymentsRaw)[number]>();
  for (const p of paymentsRaw) {
    const key = p.reservation_id;
    const prev = paymentsGroupedMap.get(key);
    if (!prev) {
      paymentsGroupedMap.set(key, { ...p });
      continue;
    }
    const rooms = new Set(`${prev.room_number}, ${p.room_number}`.split(", ").filter(Boolean));
    const methods = new Set([prev.method, p.method, ...(prev.additional_methods ?? []), ...(p.additional_methods ?? [])]);
    prev.room_number = Array.from(rooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join(", ");
    prev.amount += p.amount;
    prev.total_amount = (prev.total_amount ?? 0) + (p.total_amount ?? 0);
    prev.reservation_paid_amount = (prev.reservation_paid_amount ?? 0) + (p.reservation_paid_amount ?? 0);
    prev.additional_methods = Array.from(methods).filter((m) => m !== prev.method) as typeof prev.additional_methods;
    if (new Date(p.paid_at).getTime() > new Date(prev.paid_at).getTime()) {
      prev.paid_at = p.paid_at;
      prev.registered_by = p.registered_by;
    }
    if (prev.status !== "refunded") {
      prev.status = (prev.total_amount ?? 0) > (prev.amount ?? 0) ? "partial" : "completed";
    }
  }
  const pendingByReservationId = new Map(
    pendingReservations.map((r) => [r.reservationId, r] as const)
  );

  const payments = Array.from(paymentsGroupedMap.values()).map((p) => {
    const pending = pendingByReservationId.get(p.reservation_id);
    if (!pending) return p;
    const paid = pending.paidAmount ?? p.amount;
    const total = pending.totalAmount ?? p.total_amount ?? 0;
    const status: "completed" | "partial" | "pending" | "refunded" =
      p.status === "refunded" ? "refunded" : paid >= total ? "completed" : paid > 0 ? "partial" : "pending";
    return {
      ...p,
      room_number: pending.roomNumber,
      amount: paid,
      total_amount: total,
      reservation_paid_amount: paid,
      status,
    };
  });

  const pendingSelected = openReservationId
    ? pendingReservations.find((r) => r.reservationId === openReservationId)
    : undefined;

  const reservationPayload =
    pendingSelected
      ? {
          reservationId: pendingSelected.reservationId,
          guestName: pendingSelected.guestName,
          roomNumber: pendingSelected.roomNumber,
          totalAmount: pendingSelected.totalAmount,
        }
      : reservationForPayment && reservationForPayment.payments.length === 0
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
