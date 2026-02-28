import type { UserRole } from "@/lib/types/database";
import { requireAuth } from "@/lib/require-auth";
import { getPayments } from "@/lib/queries/payments";
import { AdminPaymentsView } from "@/components/payments/admin-payments-view";
import { ReceptionistPaymentsView } from "@/components/payments/receptionist-payments-view";

export default async function PaymentsPage() {
  const session = await requireAuth();
  const userRole: UserRole = session.user.role === "ADMIN" ? "admin" : "receptionist";
  const raw = await getPayments(session.user.establishmentId);
  const payments = raw.map((p) => ({
    id: p.id,
    paid_at: p.paidAt.toISOString(),
    guest_name: p.reservation.guest.fullName,
    room_number: p.reservation.room.roomNumber,
    amount: p.amount,
    total_amount: p.reservation.totalAmount,
    method: p.method.toLowerCase() as "cash" | "debit" | "credit" | "transfer" | "other",
    status: p.status.toLowerCase() as "completed" | "partial" | "pending" | "refunded",
    registered_by: p.registeredBy.fullName,
  }));

  return (
    <div className="p-6">
      {userRole === "admin" && <AdminPaymentsView payments={payments} />}
      {userRole === "receptionist" && <ReceptionistPaymentsView payments={payments} />}
    </div>
  );
}
