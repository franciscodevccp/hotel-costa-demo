import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types/database";
import { getMockSessionServer } from "@/lib/mock-auth";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { ReceptionistDashboard } from "@/components/dashboard/receptionist-dashboard";

export default async function DashboardPage() {
  const session = await getMockSessionServer();

  if (!session) {
    redirect("/login");
  }

  const userRole = session.role;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Bienvenido, {session.full_name}
        </p>
      </div>

      {userRole === "admin" && <AdminDashboard />}
      {userRole === "receptionist" && <ReceptionistDashboard />}
    </div>
  );
}
