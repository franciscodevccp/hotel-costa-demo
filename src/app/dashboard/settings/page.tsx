import { requireAuth } from "@/lib/require-auth";
import { getEstablishment, getWorkers } from "@/lib/queries/settings";
import { AdminSettingsView } from "@/components/settings/admin-settings-view";

export default async function SettingsPage() {
  const session = await requireAuth(["ADMIN"]);
  const [establishment, workers] = await Promise.all([
    getEstablishment(session.user.establishmentId),
    getWorkers(session.user.establishmentId),
  ]);
  const establishmentForView = establishment
    ? {
        id: establishment.id,
        name: establishment.name,
        address: establishment.address ?? "",
        phone: establishment.phone ?? "",
        email: establishment.email ?? "",
        total_rooms: establishment.totalRooms ?? 0,
        logo_url: establishment.logoUrl,
        created_at: "",
      }
    : null;
  const workersForView = workers.map((w) => ({
    id: w.id,
    auth_id: null,
    establishment_id: session.user.establishmentId,
    full_name: w.fullName,
    email: w.email,
    role: (w.role === "ADMIN" ? "admin" : "receptionist") as "admin" | "receptionist",
    avatar_url: null,
    is_active: w.isActive,
    created_at: "",
  }));

  return (
    <div className="p-6">
      <AdminSettingsView establishment={establishmentForView} workers={workersForView} />
    </div>
  );
}
