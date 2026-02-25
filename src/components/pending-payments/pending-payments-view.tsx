"use client";

import { useState } from "react";
import {
  Building2,
  User,
  Search,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type PendingCompany = Awaited<ReturnType<typeof import("@/lib/queries/pending-payments").getPendingCompanies>>[number];
type PendingPerson = Awaited<ReturnType<typeof import("@/lib/queries/pending-payments").getPendingPersons>>[number];

export function PendingPaymentsView({
  companies,
  persons,
}: {
  companies: PendingCompany[];
  persons: PendingPerson[];
}) {
  const [companySearch, setCompanySearch] = useState("");
  const [personSearch, setPersonSearch] = useState("");

  const formatCLP = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (date: Date) =>
    format(date, "d MMM yyyy", { locale: es });

  const filteredCompanies = companies.filter(
    (c) =>
      !companySearch ||
      c.companyName.toLowerCase().includes(companySearch.toLowerCase()) ||
      (c.companyRut?.includes(companySearch)) ||
      (c.companyEmail?.toLowerCase().includes(companySearch.toLowerCase()))
  );

  const filteredPersons = persons.filter(
    (p) =>
      !personSearch ||
      p.guestName.toLowerCase().includes(personSearch.toLowerCase()) ||
      p.roomNumber.includes(personSearch)
  );

  const totalCompaniesPending = filteredCompanies.reduce((s, c) => s + c.pendingAmount, 0);
  const totalPersonsPending = filteredPersons.reduce((s, p) => s + p.pendingAmount, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Pagos pendientes
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Empresas (pago en días hábiles) y personas con saldo pendiente (demo).
        </p>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--primary)]/10 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[var(--primary)]/20 p-2.5">
              <Building2 className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <p className="text-sm font-medium text-[var(--muted)]">
              Total pendiente empresas
            </p>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-[var(--primary)]">
            {formatCLP(totalCompaniesPending)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {filteredCompanies.length} empresa(s) con pagos en días hábiles
          </p>
        </div>
        <div className="rounded-xl border border-[var(--warning)]/20 bg-gradient-to-br from-[var(--warning)]/5 to-[var(--warning)]/10 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[var(--warning)]/20 p-2.5">
              <User className="h-5 w-5 text-[var(--warning)]" />
            </div>
            <p className="text-sm font-medium text-[var(--muted)]">
              Total pendiente personas
            </p>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-[var(--warning)]">
            {formatCLP(totalPersonsPending)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {filteredPersons.length} persona(s) con saldo pendiente
          </p>
        </div>
      </div>

      {/* Sección Empresas */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[var(--background)] px-5 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
              <Building2 className="h-5 w-5 text-[var(--primary)]" />
              Empresas
            </h3>
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Buscar por empresa, RUT o email..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Pagos en días hábiles. Se muestra cuántos días restan para el vencimiento.
          </p>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {filteredCompanies.length === 0 ? (
            <div className="p-12 text-center text-[var(--muted)]">
              No hay empresas pendientes que coincidan con la búsqueda
            </div>
          ) : (
            filteredCompanies.map((company) => (
              <div
                key={company.id}
                className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between hover:bg-[var(--background)]/50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                    <Building2 className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">
                      {company.companyName}
                    </p>
                    <p className="text-xs text-[var(--muted)]">RUT: {company.companyRut ?? "—"}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Hab. {company.roomNumber} — {company.guestName}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {company.companyEmail ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[var(--muted)]" />
                    <span className="text-lg font-bold text-[var(--foreground)]">
                      {formatCLP(company.pendingAmount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[var(--muted)]" />
                    <span className="text-sm text-[var(--foreground)]">
                      Vence: {formatDate(company.due_date)}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${
                      company.business_days_remaining <= 5
                        ? "bg-[var(--destructive)]/10 text-[var(--destructive)]"
                        : company.business_days_remaining <= 10
                          ? "bg-[var(--warning)]/10 text-[var(--warning)]"
                          : "bg-[var(--success)]/10 text-[var(--success)]"
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    <span className="font-semibold">
                      {company.business_days_remaining} días hábiles
                    </span>
                    <span className="text-xs opacity-90">restantes</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Sección Personas */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[var(--background)] px-5 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
              <User className="h-5 w-5 text-[var(--warning)]" />
              Personas con saldo pendiente
            </h3>
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Buscar por nombre, RUT o habitación..."
                value={personSearch}
                onChange={(e) => setPersonSearch(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Huéspedes que han realizado abonos y tienen saldo por pagar.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="px-4 py-3 font-medium text-[var(--foreground)]">
                  Huésped
                </th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)]">
                  Habitación
                </th>
                <th className="px-4 py-3 text-right font-medium text-[var(--foreground)]">
                  Total
                </th>
                <th className="px-4 py-3 text-right font-medium text-[var(--foreground)]">
                  Abonado
                </th>
                <th className="px-4 py-3 text-right font-medium text-[var(--foreground)]">
                  Saldo pendiente
                </th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)]">
                  Check-out
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPersons.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-[var(--muted)]"
                  >
                    No hay personas con saldo pendiente
                  </td>
                </tr>
              ) : (
                filteredPersons.map((person) => (
                  <tr
                    key={person.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/50"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">
                          {person.guestName}
                        </p>
                        {person.guestPhone && (
                          <p className="text-xs text-[var(--muted)]">
                            {person.guestPhone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      Hab. {person.roomNumber}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--muted)]">
                      {formatCLP(person.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--success)]">
                      {formatCLP(person.paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning)]/10 px-2.5 py-0.5 font-semibold text-[var(--warning)]">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {formatCLP(person.pendingAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {formatDate(person.checkOut)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
