import type { UserRole } from "@/lib/types/database";
import { requireAuth } from "@/lib/require-auth";
import {
  getDashboardStats,
  getPendingPaymentsPreview,
  getLowStockProducts,
  getRecentActivity,
  getTodayCheckins,
  getTodayCheckouts,
} from "@/lib/queries/dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { ReceptionistDashboard } from "@/components/dashboard/receptionist-dashboard";

export default async function DashboardPage() {
  const session = await requireAuth();
  const establishmentId = session.user.establishmentId;
  const userRole: UserRole = session.user.role === "ADMIN" ? "admin" : "receptionist";

  const [stats, pagosPendientesPreview, productosBajoStock, recentActivity, todayCheckins, todayCheckouts] = await Promise.all([
    getDashboardStats(establishmentId),
    getPendingPaymentsPreview(establishmentId, 5),
    getLowStockProducts(establishmentId, 10),
    getRecentActivity(establishmentId, 5),
    getTodayCheckins(establishmentId),
    getTodayCheckouts(establishmentId),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Bienvenido, {session.user.name}</p>
      </div>

      {userRole === "admin" && (
        <AdminDashboard
          stats={stats}
          pagosPendientesPreview={pagosPendientesPreview}
          productosBajoStock={productosBajoStock}
          recentActivity={recentActivity}
        />
      )}
      {userRole === "receptionist" && (
        <ReceptionistDashboard
          stats={stats}
          pagosPendientesPreview={pagosPendientesPreview}
          productosBajoStock={productosBajoStock}
          todayCheckins={todayCheckins}
          todayCheckouts={todayCheckouts}
        />
      )}
    </div>
  );
}
