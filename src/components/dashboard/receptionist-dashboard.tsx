import {
  LogIn,
  LogOut,
  Calendar,
  BedDouble,
  Clock,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { WidgetCard } from "@/components/dashboard/widget-card";

export function ReceptionistDashboard() {
  const formatCLP = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);

  const stats = {
    checkinsToday: 5,
    checkoutsToday: 3,
    availableRooms: 8,
    upcomingReservations: 12,
    pagosPendientes: 370000,
  };

  const todayCheckins = [
    { id: 1, guest: "Carlos Rodríguez", room: "101", time: "14:00" },
    { id: 2, guest: "Laura Fernández", room: "205", time: "15:30" },
    { id: 3, guest: "Miguel Ángel", room: "308", time: "16:00" },
  ];

  const todayCheckouts = [
    { id: 1, guest: "Ana Silva", room: "102", time: "11:00", status: "Completado" },
    { id: 2, guest: "Roberto Díaz", room: "204", time: "12:00", status: "Pendiente" },
  ];

  const pagosPendientesPreview = [
    { name: "Ana Martínez", room: "301", amount: 100000 },
    { name: "Patricia López", room: "103", amount: 120000 },
  ];

  return (
    <div className="space-y-6">
      {/* Métricas del día */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Check-ins Hoy"
          value={stats.checkinsToday}
          icon={LogIn}
          description="3 completados, 2 pendientes"
        />
        <StatCard
          title="Check-outs Hoy"
          value={stats.checkoutsToday}
          icon={LogOut}
          description="1 completado, 2 pendientes"
        />
        <StatCard
          title="Habitaciones Disponibles"
          value={stats.availableRooms}
          icon={BedDouble}
        />
        <StatCard
          title="Próximas Reservas"
          value={stats.upcomingReservations}
          icon={Calendar}
          description="Próximos 7 días"
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
        {/* Check-ins de hoy */}
        <WidgetCard title="Check-ins de Hoy">
          <div className="space-y-3">
            {todayCheckins.map((checkin) => (
              <div
                key={checkin.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {checkin.guest}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Habitación {checkin.room}
                  </p>
                </div>
                <span className="text-sm font-medium text-[var(--primary)]">
                  {checkin.time}
                </span>
              </div>
            ))}
          </div>
        </WidgetCard>

        {/* Check-outs de hoy */}
        <WidgetCard title="Check-outs de Hoy">
          <div className="space-y-3">
            {todayCheckouts.map((checkout) => (
              <div
                key={checkout.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {checkout.guest}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Habitación {checkout.room}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[var(--primary)]">
                    {checkout.time}
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
            ))}
          </div>
        </WidgetCard>

        {/* Pagos pendientes (personas) */}
        <WidgetCard
          title="Pagos Pendientes"
          href="/dashboard/pending-payments"
        >
          <div className="space-y-3">
            {pagosPendientesPreview.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-3"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[var(--warning)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {p.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Hab. {p.room}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-[var(--warning)]">
                  {formatCLP(p.amount)}
                </span>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}
