"use client";

import { useState } from "react";
import { Search, Plus, Users, Mail, Phone, MapPin, Calendar, DollarSign } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";

interface Guest {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    nationality: string;
    id_number: string;
    status: "active" | "checked_out" | "blacklisted";
    current_room?: string;
    check_in_date?: string;
    check_out_date?: string;
    total_stays: number;
    total_spent: number;
}

export function AdminGuestsView() {
    const [statusFilter, setStatusFilter] = useState("");
    // Datos de ejemplo
    const guests: Guest[] = [
        {
            id: "1",
            full_name: "María González",
            email: "maria@example.com",
            phone: "+56912345678",
            nationality: "Chile",
            id_number: "12.345.678-9",
            status: "active",
            current_room: "102",
            check_in_date: "2026-02-12",
            check_out_date: "2026-02-15",
            total_stays: 5,
            total_spent: 450000,
        },
        {
            id: "2",
            full_name: "Carlos Ruiz",
            email: "carlos@example.com",
            phone: "+56923456789",
            nationality: "Argentina",
            id_number: "23.456.789-0",
            status: "active",
            current_room: "204",
            check_in_date: "2026-02-13",
            check_out_date: "2026-02-16",
            total_stays: 2,
            total_spent: 180000,
        },
        {
            id: "3",
            full_name: "Ana Martínez",
            email: "ana@example.com",
            phone: "+56934567890",
            nationality: "Chile",
            id_number: "34.567.890-1",
            status: "checked_out",
            total_stays: 8,
            total_spent: 720000,
        },
    ];

    const statusColors = {
        active: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
        checked_out: "bg-[var(--muted)]/10 text-[var(--muted)] border-[var(--muted)]/20",
        blacklisted: "bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]/20",
    };

    const statusLabels = {
        active: "Activo",
        checked_out: "Check-out",
        blacklisted: "Bloqueado",
    };

    const formatCLP = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CL', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Gestión de Huéspedes</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">Administra la información de todos los huéspedes</p>
                </div>
                <button className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 w-full md:w-auto">
                    <Plus className="h-4 w-4" />
                    Nuevo Huésped
                </button>
            </div>

            {/* Estadísticas rápidas */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-[var(--success)]/20 bg-gradient-to-br from-[var(--success)]/5 to-[var(--success)]/10 p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[var(--success)]/20 p-2.5">
                            <Users className="h-5 w-5 text-[var(--success)]" />
                        </div>
                        <p className="text-sm font-medium text-[var(--muted)]">Huéspedes Activos</p>
                    </div>
                    <p className="mt-3 text-4xl font-bold tracking-tight text-[var(--success)]">
                        {guests.filter(g => g.status === "active").length}
                    </p>
                </div>
                <div className="rounded-xl border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--primary)]/10 p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[var(--primary)]/20 p-2.5">
                            <Users className="h-5 w-5 text-[var(--primary)]" />
                        </div>
                        <p className="text-sm font-medium text-[var(--muted)]">Total Huéspedes</p>
                    </div>
                    <p className="mt-3 text-4xl font-bold tracking-tight text-[var(--primary)]">{guests.length}</p>
                </div>
                <div className="rounded-xl border border-[var(--warning)]/20 bg-gradient-to-br from-[var(--warning)]/5 to-[var(--warning)]/10 p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[var(--warning)]/20 p-2.5">
                            <DollarSign className="h-5 w-5 text-[var(--warning)]" />
                        </div>
                        <p className="text-sm font-medium text-[var(--muted)]">Ingresos Totales</p>
                    </div>
                    <p className="mt-3 text-2xl font-bold tracking-tight text-[var(--warning)]">
                        {formatCLP(guests.reduce((sum, g) => sum + g.total_spent, 0))}
                    </p>
                </div>
            </div>

            {/* Búsqueda y filtros */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email o RUT..."
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2.5 pl-10 pr-4 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:shadow-md"
                    />
                </div>
                <CustomSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="Todos los estados"
                    options={[
                        { value: "active", label: "Activos" },
                        { value: "checked_out", label: "Check-out" },
                        { value: "blacklisted", label: "Bloqueados" },
                    ]}
                    className="min-w-[160px]"
                />
            </div>

            {/* Lista de huéspedes */}
            <div className="space-y-3">
                {guests.map((guest) => (
                    <div
                        key={guest.id}
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-all hover:shadow-md"
                    >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 shadow-sm">
                                    <Users className="h-6 w-6 text-[var(--primary)]" />
                                </div>
                                <div className="flex-1 space-y-3">
                                    {/* Encabezado: Nombre y Estado */}
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="font-semibold text-[var(--foreground)]">{guest.full_name}</h3>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${statusColors[guest.status]}`}>
                                            {statusLabels[guest.status]}
                                        </span>
                                    </div>

                                    {/* Detalles en Grid */}
                                    <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm text-[var(--muted)] sm:grid-cols-2">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 shrink-0 text-[var(--muted)]/70" />
                                            <span className="truncate">{guest.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 shrink-0 text-[var(--muted)]/70" />
                                            <span>{guest.phone}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 shrink-0 text-[var(--muted)]/70" />
                                            <span>{guest.nationality}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[var(--muted)]/70 font-mono text-xs border border-[var(--border)] rounded px-1">RUT</span>
                                            <span>{guest.id_number}</span>
                                        </div>

                                        {guest.status === "active" && (
                                            <div className="col-span-1 sm:col-span-2 flex items-center gap-2 mt-1 rounded-md bg-[var(--primary)]/5 p-2 text-[var(--primary)]">
                                                <Calendar className="h-4 w-4 shrink-0" />
                                                <span className="font-medium">
                                                    Hab. {guest.current_room} · {formatDate(guest.check_in_date!)} - {formatDate(guest.check_out_date!)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer: Estadísticas y Acciones */}
                            <div className="mt-2 flex flex-col gap-3 border-t border-[var(--border)] pt-4 md:mt-0 md:w-auto md:border-0 md:pt-0 md:text-right">
                                <div className="flex items-center justify-between md:block">
                                    <p className="text-sm text-[var(--muted)]">{guest.total_stays} {guest.total_stays === 1 ? 'estadía' : 'estadías'}</p>
                                    <p className="text-lg font-bold text-[var(--foreground)]">{formatCLP(guest.total_spent)}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 md:flex md:justify-end">
                                    <button className="flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]">
                                        Editar
                                    </button>
                                    <button className="flex items-center justify-center rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[var(--primary)]/90">
                                        Ver historial
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
