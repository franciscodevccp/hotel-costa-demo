import type { UserRole } from "@/lib/types/database";
import { requireAuth } from "@/lib/require-auth";
import { getRooms } from "@/lib/queries/rooms";
import { AdminRoomsView } from "@/components/rooms/admin-rooms-view";
import { ReceptionistRoomsView } from "@/components/rooms/receptionist-rooms-view";

export default async function RoomsPage() {
  const session = await requireAuth();
  const userRole: UserRole = session.user.role === "ADMIN" ? "admin" : "receptionist";
  const rooms = await getRooms(session.user.establishmentId);

  return (
    <div className="p-6">
      {userRole === "admin" && <AdminRoomsView rooms={rooms} />}
      {userRole === "receptionist" && <ReceptionistRoomsView rooms={rooms} />}
    </div>
  );
}
