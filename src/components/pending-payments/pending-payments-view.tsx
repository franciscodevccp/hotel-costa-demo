"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  User,
  Search,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  CreditCard,
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
      p.roomNumber.includes(personSearch) ||
      (p.companyName?.toLowerCase().includes(personSearch.toLowerCase()) ?? false)
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
          Empresas (pago en días hábiles) y personas con saldo pendiente.
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
            {filteredPersons.length} reserva(s) con saldo pendiente
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
                className="grid grid-cols-1 gap-4 p-4 sm:p-5 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] sm:items-center hover:bg-[var(--background)]/50"
              >
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                    <Building2 className="h-4 w-4 text-[var(--primary)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--foreground)] truncate">
                      {company.companyName}
                    </p>
                    <p className="text-xs text-[var(--muted)]">RUT: {company.companyRut ?? "—"}</p>
                    <p className="text-xs text-[var(--muted)]">
                      Hab. {company.roomNumber} — {company.guestName}
                      {company.companyEmail ? ` · ${company.companyEmail}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:justify-self-end">
                  <DollarSign className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                  <span className="text-base font-bold text-[var(--foreground)] whitespace-nowrap">
                    {formatCLP(company.pendingAmount)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--foreground)] whitespace-nowrap">
                  <Calendar className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                  <span>Vence: {formatDate(company.due_date)}</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                    company.business_days_remaining <= 5
                      ? "bg-[var(--destructive)]/10 text-[var(--destructive)]"
                      : company.business_days_remaining <= 10
                        ? "bg-[var(--warning)]/10 text-[var(--warning)]"
                        : "bg-[var(--success)]/10 text-[var(--success)]"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>{company.business_days_remaining} d. hábiles</span>
                </div>
                <div className="sm:justify-self-end">
                  <Link
                    href={`/dashboard/payments?reservation=${company.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1.5 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/20"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Registrar pago
                  </Link>
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
              Reservas con saldo pendiente
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
            Personas y empresas (sin orden de compra) con saldo pendiente.
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
                <th className="px-4 py-3 font-medium text-[var(--foreground)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPersons.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-[var(--muted)]"
                  >
                    No hay reservas con saldo pendiente
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
                          {person.companyName && (
                            <span className="ml-1.5 rounded-full bg-[var(--secondary)]/20 px-2 py-0.5 text-xs font-medium text-[var(--secondary)]">
                              Empresa
                            </span>
                          )}
                        </p>
                        {(person.guestPhone || person.companyName) && (
                          <p className="text-xs text-[var(--muted)]">
                            {person.companyName && <span>{person.companyName}</span>}
                            {person.companyName && person.guestPhone && " · "}
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
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/payments?reservation=${person.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1.5 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/20"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Registrar pago
                      </Link>
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
