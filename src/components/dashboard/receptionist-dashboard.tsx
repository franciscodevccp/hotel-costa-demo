import {
  LogIn,
  LogOut,
  BedDouble,
  Clock,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { StatCard } from "@/components/dashboard/stat-card";
import { WidgetCard } from "@/components/dashboard/widget-card";

type DashboardStats = Awaited<ReturnType<typeof import("@/lib/queries/dashboard").getDashboardStats>>;
type PendingPreview = Awaited<ReturnType<typeof import("@/lib/queries/dashboard").getPendingPaymentsPreview>>;
type LowStock = Awaited<ReturnType<typeof import("@/lib/queries/dashboard").getLowStockProducts>>;
type TodayCheckins = Awaited<ReturnType<typeof import("@/lib/queries/dashboard").getTodayCheckins>>;
type TodayCheckouts = Awaited<ReturnType<typeof import("@/lib/queries/dashboard").getTodayCheckouts>>;

export function ReceptionistDashboard({
  stats,
  pagosPendientesPreview,
  productosBajoStock,
  todayCheckins,
  todayCheckouts,
}: {
  stats: DashboardStats;
  pagosPendientesPreview: PendingPreview;
  productosBajoStock: LowStock;
  todayCheckins: TodayCheckins;
  todayCheckouts: TodayCheckouts;
}) {
  const formatCLP = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);

  const pendingItems = pagosPendientesPreview.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Check-ins Hoy"
          value={stats.checkinsToday}
          icon={LogIn}
          description={`${todayCheckins.length} reservas`}
        />
        <StatCard
          title="Check-outs Hoy"
          value={stats.checkoutsToday}
          icon={LogOut}
          description={`${todayCheckouts.length} reservas`}
        />
        <StatCard
          title="Habitaciones Disponibles"
          value={stats.availableRooms}
          icon={BedDouble}
        />
        <StatCard
          title="Pagos Pendientes"
          value={formatCLP(stats.pagosPendientes)}
          icon={Clock}
          description="Por cobrar"
          href="/dashboard/pending-payments"
          variant="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <WidgetCard title="Check-ins de Hoy">
          <div className="space-y-3">
            {todayCheckins.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No hay check-ins programados hoy</p>
            ) : (
              todayCheckins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{checkin.guest}</p>
                    <p className="text-xs text-[var(--muted)]">Habitación {checkin.room}</p>
                  </div>
                  <span className="text-sm font-medium text-[var(--primary)]">
                    {format(checkin.time, "HH:mm", { locale: es })}
                  </span>
                </div>
              ))
            )}
          </div>
        </WidgetCard>

        <WidgetCard title="Check-outs de Hoy">
          <div className="space-y-3">
            {todayCheckouts.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No hay check-outs hoy</p>
            ) : (
              todayCheckouts.map((checkout) => (
                <div
                  key={checkout.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{checkout.guest}</p>
                    <p className="text-xs text-[var(--muted)]">Habitación {checkout.room}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[var(--primary)]">
                      {format(checkout.time, "HH:mm", { locale: es })}
                    </p>
                    <span
                      className={`text-xs ${
                        checkout.status === "Completado"
                          ? "text-[var(--success)]"
                          : "text-[var(--warning)]"
                      }`}
                    >
                      {checkout.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </WidgetCard>

        <WidgetCard title="Pagos Pendientes" href="/dashboard/pending-payments">
          <div className="space-y-3">
            {pendingItems.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Sin pagos pendientes</p>
            ) : (
              pendingItems.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[var(--warning)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{p.name}</p>
                      {p.type === "empresa" ? (
                        <p className="text-xs text-[var(--muted)]">Empresa</p>
                      ) : p.room ? (
                        <p className="text-xs text-[var(--muted)]">Hab. {p.room}</p>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[var(--warning)]">
                    {formatCLP(p.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}
