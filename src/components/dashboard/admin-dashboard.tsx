import {
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  Package,
  AlertTriangle,
  Building2,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { WidgetCard } from "@/components/dashboard/widget-card";

export function AdminDashboard() {
  const formatCLP = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  // Datos mock - métricas principales
  const stats = {
    revenue: 2450000,
    revenueTrend: 12,
    occupancy: 85,
    occupancyTrend: 5,
    reservations: 24,
    guests: 42,
    cobradoHoy: 360000,
    pagosPendientes: 370000,
    productosBajoStock: 4,
  };

  // Pagos pendientes (personas + empresas)
  const pagosPendientesPreview = [
    { type: "persona", name: "Ana Martínez", amount: 100000, room: "301" },
    { type: "persona", name: "Patricia López", amount: 120000, room: "103" },
    { type: "empresa", name: "Constructora Pacífico", amount: 450000 },
  ];

  // Productos con stock bajo
  const productosBajoStock = [
    { name: "Jabón de tocador", stock: 12, min: 20, unit: "unidad" },
    { name: "Papel higiénico", stock: 8, min: 15, unit: "rollo" },
    { name: "Toalla grande", stock: 25, min: 30, unit: "unidad" },
    { name: "Café molido", stock: 3, min: 10, unit: "kg" },
  ];

  const recentActivity = [
    { id: 1, action: "Nueva reserva", user: "María González", time: "Hace 5 min" },
    { id: 2, action: "Check-in completado", user: "Juan Pérez", time: "Hace 15 min" },
    { id: 3, action: "Pago recibido", user: "Ana Martínez", time: "Hace 1 hora" },
    { id: 4, action: "Abono registrado", user: "Patricia López", time: "Hace 2 horas" },
    { id: 5, action: "Boleta sincronizada", user: "Juan Riquelme", time: "Hace 3 horas" },
  ];

  return (
    <div className="space-y-6">
      {/* Fila 1: Métricas principales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ingresos del Mes"
          value={formatCLP(stats.revenue)}
          icon={DollarSign}
          trend={{ value: stats.revenueTrend, isPositive: true }}
        />
        <StatCard
          title="Ocupación"
          value={`${stats.occupancy}%`}
          icon={TrendingUp}
          trend={{ value: stats.occupancyTrend, isPositive: true }}
          description="17 de 20 habitaciones"
        />
        <StatCard
          title="Reservas Activas"
          value={stats.reservations}
          icon={Calendar}
        />
        <StatCard
          title="Huéspedes Actuales"
          value={stats.guests}
          icon={Users}
        />
      </div>

      {/* Fila 2: Alertas y cobranzas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Cobrado Hoy"
          value={formatCLP(stats.cobradoHoy)}
          icon={CreditCard}
          description="Pagos del día"
          href="/dashboard/payments"
        />
        <StatCard
          title="Pagos Pendientes"
          value={formatCLP(stats.pagosPendientes)}
          icon={Clock}
          description="Por cobrar (personas + empresas)"
          href="/dashboard/pending-payments"
          variant="warning"
        />
        <StatCard
          title="Productos Bajo Stock"
          value={stats.productosBajoStock}
          icon={AlertTriangle}
          description="Requieren atención"
          href="/dashboard/inventory"
          variant="warning"
        />
        <StatCard
          title="Boletas Este Mes"
          value={12}
          icon={Package}
          description="Documentos registrados"
          href="/dashboard/invoices"
        />
      </div>

      {/* Widgets: 3 columnas */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Actividad reciente */}
        <WidgetCard title="Actividad Reciente">
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between border-b border-[var(--border)] pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {activity.action}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{activity.user}</p>
                </div>
                <span className="text-xs text-[var(--muted)]">{activity.time}</span>
              </div>
            ))}
          </div>
        </WidgetCard>

        {/* Pagos pendientes por cobrar */}
        <WidgetCard
          title="Pagos Pendientes"
          href="/dashboard/pending-payments"
        >
          <div className="space-y-3">
            {pagosPendientesPreview.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3"
              >
                <div className="flex items-center gap-2">
                  {item.type === "empresa" ? (
                    <Building2 className="h-4 w-4 text-[var(--primary)]" />
                  ) : (
                    <Users className="h-4 w-4 text-[var(--primary)]" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {item.name}
                    </p>
                    {item.room && (
                      <p className="text-xs text-[var(--muted)]">Hab. {item.room}</p>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-[var(--warning)]">
                  {formatCLP(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </WidgetCard>

        {/* Productos bajo stock */}
        <WidgetCard title="Productos Bajo Stock" href="/dashboard/inventory">
          <div className="space-y-3">
            {productosBajoStock.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-3"
              >
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-[var(--warning)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {p.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Mín: {p.min} {p.unit}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-[var(--destructive)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--destructive)]">
                  {p.stock} {p.unit}
                </span>
              </div>
            ))}
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}
