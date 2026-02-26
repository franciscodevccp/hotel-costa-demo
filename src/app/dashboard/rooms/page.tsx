import { requireAuth } from "@/lib/require-auth";
import { getRooms } from "@/lib/queries/rooms";
import { AdminRoomsView } from "@/components/rooms/admin-rooms-view";

export default async function RoomsPage() {
  const session = await requireAuth();
  const rooms = await getRooms(session.user.establishmentId);

  return (
    <div className="p-6">
      <AdminRoomsView rooms={rooms} />
    </div>
  );
}
