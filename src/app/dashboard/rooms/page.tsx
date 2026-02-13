import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types/database";
import { getMockSessionServer } from "@/lib/mock-auth";
import { AdminRoomsView } from "@/components/rooms/admin-rooms-view";
import { ReceptionistRoomsView } from "@/components/rooms/receptionist-rooms-view";

export default async function RoomsPage() {
  const session = await getMockSessionServer();

  if (!session) {
    redirect("/login");
  }

  const userRole = session.role;

  return (
    <div className="p-6">
      {userRole === "admin" && <AdminRoomsView />}
      {userRole === "receptionist" && <ReceptionistRoomsView />}
    </div>
  );
}
