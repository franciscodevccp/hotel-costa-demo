"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-media-query";
import { DashboardSidebar } from "./dashboard-sidebar";
import type { UserRole } from "@/lib/types/database";

type DashboardShellProps = {
  userName: string;
  userRole: UserRole;
  establishmentName: string;
  children: React.ReactNode;
};

export function DashboardShell({
  userName,
  userRole,
  establishmentName,
  children,
}: DashboardShellProps) {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="flex h-screen min-h-[100dvh] overflow-hidden">
      {/* Backdrop móvil */}
      {/* Backdrop móvil */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Sidebar: en móvil es overlay (fixed), en desktop es columna (relative) */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 flex h-full flex-col bg-[var(--primary)] text-[var(--primary-foreground)] transition-transform duration-300 ease-out shadow-xl
          md:relative md:translate-x-0 md:shadow-none
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <DashboardSidebar
          userName={userName}
          userRole={userRole}
          establishmentName={establishmentName}
          onLinkClick={isMobile ? closeMobileMenu : undefined}
          forceExpanded={isMobile}
        />
      </div>

      {/* Contenido principal */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Barra superior solo en móvil */}
        {/* Barra superior solo en móvil */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--card)] px-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--background)]"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Hotel de la Costa
          </span>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--background)]">
          {children}
        </main>
      </div>
    </div>
  );
}
