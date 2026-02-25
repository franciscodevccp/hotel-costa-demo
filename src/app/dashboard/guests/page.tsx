import type { UserRole } from "@/lib/types/database";
import { requireAuth } from "@/lib/require-auth";
import { getGuests } from "@/lib/queries/guests";
import { AdminGuestsView } from "@/components/guests/admin-guests-view";
import { ReceptionistGuestsView } from "@/components/guests/receptionist-guests-view";

export default async function GuestsPage() {
  const session = await requireAuth();
  const userRole: UserRole = session.user.role === "ADMIN" ? "admin" : "receptionist";
  const guests = await getGuests(session.user.establishmentId);

  return (
    <div className="p-6">
      {userRole === "admin" && <AdminGuestsView guests={guests} />}
      {userRole === "receptionist" && <ReceptionistGuestsView guests={guests} />}
    </div>
  );
}
