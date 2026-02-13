import { redirect } from "next/navigation";
import { getMockSessionServer } from "@/lib/mock-auth";
import { AdminGuestsView } from "@/components/guests/admin-guests-view";
import { ReceptionistGuestsView } from "@/components/guests/receptionist-guests-view";

export default async function GuestsPage() {
  const session = await getMockSessionServer();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="p-6">
      {session.role === "admin" && <AdminGuestsView />}
      {session.role === "receptionist" && <ReceptionistGuestsView />}
    </div>
  );
}
