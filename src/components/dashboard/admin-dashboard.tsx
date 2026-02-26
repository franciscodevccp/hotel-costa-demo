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
import { StatCard } from "@/components/dashboard/stat-card";
import { WidgetCard } from "@/components/dashboard/widget-card";

type DashboardStats = Awaited<ReturnType<typeof import("@/lib/queries/dashboard").getDashboardStats>>;
type PendingPreview = Awaited<ReturnType<typeof import("@/lib/queries/dashboard").getPendingPaymentsPreview>>;
type LowStock = Awaited<ReturnType<typeof import("@/lib/queries/dashboard").getLowStockProducts>>;

export function AdminDashboard({
  stats,
  pagosPendientesPreview,
  productosBajoStock,
}: {
  stats: DashboardStats;
  pagosPendientesPreview: PendingPreview;
  productosBajoStock: LowStock;
}) {
  const formatCLP = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

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
          description={`${stats.occupiedRooms} de ${stats.totalRooms} habitaciones`}
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
          value={stats.boletasEsteMes}
          icon={Package}
          description="Documentos registrados"
          href="/dashboard/invoices"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">


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
                      Mín: {p.minStock} {p.unit}
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
