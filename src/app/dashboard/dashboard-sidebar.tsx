"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BedDouble,
  Calendar,
  Users,
  CreditCard,
  Clock,
  Package,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Banknote,
} from "lucide-react";
import type { UserRole } from "@/lib/types/database";
import { useSidebar } from "@/hooks/use-sidebar";

const navItems: { href: string; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/rooms", label: "Habitaciones", icon: BedDouble },
  { href: "/dashboard/reservations", label: "Reservas", icon: Calendar },
  { href: "/dashboard/guests", label: "Huéspedes", icon: Users },
  { href: "/dashboard/payments", label: "Pagos", icon: CreditCard },
  { href: "/dashboard/pending-payments", label: "Pagos pendientes", icon: Clock },
  { href: "/dashboard/receivables", label: "Por cobrar", icon: Wallet, adminOnly: true },
  { href: "/dashboard/payables", label: "Por pagar", icon: Banknote, adminOnly: true },
  { href: "/dashboard/inventory", label: "Inventario", icon: Package },
  { href: "/dashboard/invoices", label: "Boletas / Facturas", icon: FileText },
  { href: "/dashboard/reports", label: "Reportes", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
];

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  receptionist: "Recepcionista",
};

export function DashboardSidebar({
  userName,
  userRole,
  establishmentName,
  onLinkClick,
  forceExpanded,
}: {
  userName: string;
  userRole: UserRole;
  establishmentName: string;
  onLinkClick?: () => void;
  forceExpanded?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, toggle, isLoaded } = useSidebar();
  const collapsed = forceExpanded ? false : isCollapsed;

  async function handleSignOut() {
    const { signOut } = await import("next-auth/react");
    await signOut({ callbackUrl: "/login" });
    router.refresh();
  }

  const showSettings = userRole === "admin";

  if (!isLoaded) {
    return null;
  }

  return (
    <aside
      className={`relative flex h-screen flex-col md:border-r md:border-[var(--border)] bg-[var(--primary)] text-[var(--primary-foreground)] transition-all duration-300 ${collapsed ? "w-16" : "w-52"
        }`}
    >
      <div className="relative shrink-0 border-b border-white/10 bg-[var(--primary)] px-3 py-4">
        {!collapsed && (
          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-2 rounded-xl bg-[var(--card)] px-4 py-3 shadow-sm"
            title={establishmentName}
          >
            <Image
              src="/logo/Logo-Hotel-La-Costa.webp"
              alt=""
              width={140}
              height={56}
              className="h-9 w-auto object-contain"
            />
            <span className="text-center text-xs font-semibold tracking-tight text-[var(--foreground)]">
              {establishmentName}
            </span>
          </Link>
        )}
        {collapsed && (
          <Link
            href="/dashboard"
            className="flex h-8 items-center justify-center"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
              HC
            </div>
          </Link>
        )}
      </div>

      {!forceExpanded && (
        <button
          onClick={toggle}
          className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm hover:bg-[var(--background)] transition-colors"
          title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      )}

      <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map(({ href, label, icon: Icon, adminOnly }, index) => {
          if (href === "/dashboard/settings" && !showSettings) return null;
          if (adminOnly && userRole !== "admin") return null;

          if (userRole === "receptionist") {
            const receptionistHiddenRoutes = [
              "/dashboard/reports",
            ];
            if (receptionistHiddenRoutes.includes(href)) return null;
          }

          const isActive = pathname === href;
          const showDivider = index === 8;

          return (
            <div key={href}>
              {showDivider && (
                <div className="my-2 border-t border-white/10" />
              )}
              <Link
                href={href}
                onClick={onLinkClick}
                className={`group relative flex items-center rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 ${isActive
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
                  } ${collapsed ? "justify-center" : "gap-2.5"}`}
                title={collapsed ? label : undefined}
              >
                {isActive && !collapsed && (
                  <div className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white" />
                )}
                <Icon className={`h-4 w-4 shrink-0 transition-transform ${!isActive && 'group-hover:scale-110'}`} />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 bg-[var(--primary)] p-3">
        {!collapsed && (
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white ring-2 ring-white/20">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-xs font-semibold leading-tight text-white">{userName}</p>
              <p className="truncate text-[10px] font-medium text-white/70">{roleLabels[userRole]}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mb-3 flex justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white ring-2 ring-white/20">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          className={`group flex w-full items-center rounded-lg px-2.5 py-2 text-xs font-medium text-white/90 transition-all hover:bg-white/10 hover:text-white ${collapsed ? "justify-center" : "gap-2.5"
            }`}
          title={collapsed ? "Cerrar sesión" : undefined}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span className="truncate">Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
