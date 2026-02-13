import { redirect } from "next/navigation";
import { getMockSessionServer } from "@/lib/mock-auth";
import { AdminReservationsView } from "@/components/reservations/admin-reservations-view";
import { ReceptionistReservationsView } from "@/components/reservations/receptionist-reservations-view";

export default async function ReservationsPage() {
  const session = await getMockSessionServer();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="p-6">
      {session.role === "admin" && <AdminReservationsView />}
      {session.role === "receptionist" && <ReceptionistReservationsView />}
    </div>
  );
}
