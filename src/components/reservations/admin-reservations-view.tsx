"use client";

import { useState } from "react";
import { Calendar, Search, Plus, Users, ChevronLeft, ChevronRight, Home, X, Mail, Phone } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { addMonths, subMonths, format, getDaysInMonth, startOfMonth, isWithinInterval, parseISO, isSameDay, addDays } from "date-fns";
import { es } from "date-fns/locale";

interface Reservation {
    id: string;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    room_number: string;
    room_type: string;
    check_in: string;
    check_out: string;
    status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";
    total_price: number;
    nights: number;
    guests: number;
    special_requests?: string;
}

const ROOMS = ["101", "102", "103", "201", "202", "203", "204", "301"];

const RESERVATION_STYLES = [
    "bg-emerald-500 text-white shadow-sm border border-emerald-600/20",
    "bg-blue-500 text-white shadow-sm border border-blue-600/20",
    "bg-violet-500 text-white shadow-sm border border-violet-600/20",
];

export function AdminReservationsView() {
    const [statusFilter, setStatusFilter] = useState("");
    const [activeTab, setActiveTab] = useState<"resumen" | "calendario">("resumen");
    const [calendarDate, setCalendarDate] = useState(new Date(2026, 1, 1));
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    // Datos de ejemplo
    const reservations: Reservation[] = [
        {
            id: "1",
            guest_name: "María González",
            guest_email: "maria@example.com",
            guest_phone: "+56912345678",
            room_number: "102",
            room_type: "Double",
            check_in: "2026-02-12",
            check_out: "2026-02-15",
            status: "confirmed",
            total_price: 150000,
            nights: 3,
            guests: 2,
        },
        {
            id: "2",
            guest_name: "Carlos Ruiz",
            guest_email: "carlos@example.com",
            guest_phone: "+56923456789",
            room_number: "204",
            room_type: "Suite",
            check_in: "2026-02-13",
            check_out: "2026-02-16",
            status: "pending",
            total_price: 255000,
            nights: 3,
            guests: 2,
        },
        {
            id: "3",
            guest_name: "Ana Martínez",
            guest_email: "ana@example.com",
            guest_phone: "+56934567890",
            room_number: "301",
            room_type: "Single",
            check_in: "2026-02-10",
            check_out: "2026-02-12",
            status: "checked_in",
            total_price: 70000,
            nights: 2,
            guests: 1,
        },
    ];

    const statusColors = {
        pending: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
        confirmed: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20",
        checked_in: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
        checked_out: "bg-[var(--muted)]/10 text-[var(--muted)] border-[var(--muted)]/20",
        cancelled: "bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]/20",
    };

    const statusLabels = {
        pending: "Pendiente",
        confirmed: "Confirmada",
        checked_in: "Check-in",
        checked_out: "Check-out",
        cancelled: "Cancelada",
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

    // Calendario: obtener reserva que incluye un día para una habitación
    const getReservationForDay = (roomNumber: string, day: Date) => {
        return reservations.find((r) => {
            if (r.room_number !== roomNumber || r.status === "cancelled") return false;
            const start = parseISO(r.check_in);
            const end = parseISO(r.check_out);
            return isWithinInterval(day, { start, end }) && !isSameDay(day, end);
        });
    };

    const isStartOfReservation = (roomNumber: string, day: Date) => {
        return reservations.some((r) => r.room_number === roomNumber && r.status !== "cancelled" && isSameDay(parseISO(r.check_in), day));
    };

    const getReservationSpan = (roomNumber: string, day: Date) => {
        const r = reservations.find((r) => r.room_number === roomNumber && r.status !== "cancelled" && isSameDay(parseISO(r.check_in), day));
        if (!r) return 0;
        const start = parseISO(r.check_in);
        const end = parseISO(r.check_out);
        if (!isWithinInterval(day, { start, end }) || isSameDay(day, end)) return 0;
        const monthStart = startOfMonth(calendarDate);
        const monthEnd = addDays(startOfMonth(calendarDate), getDaysInMonth(calendarDate) - 1);
        const effectiveStart = start < monthStart ? monthStart : start;
        const effectiveEnd = end > monthEnd ? monthEnd : addDays(end, -1);
        const spanStart = isSameDay(day, effectiveStart) ? effectiveStart : day;
        let count = 0;
        let d = spanStart;
        while (d <= effectiveEnd) {
            count++;
            d = addDays(d, 1);
        }
        return count;
    };

    const daysInMonth = getDaysInMonth(calendarDate);
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => addDays(startOfMonth(calendarDate), i));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Gestión de Reservas</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                        {activeTab === "resumen" ? "Administra todas las reservas del establecimiento" : "Calendario de disponibilidad habitación por habitación y valores por noche"}
                    </p>
                </div>
                <button className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 w-full md:w-auto">
                    <Plus className="h-4 w-4" />
                    Nueva Reserva
                </button>
            </div>

            {/* Tabs Resumen / Calendario */}
            <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-1">
                <button
                    onClick={() => setActiveTab("resumen")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${activeTab === "resumen" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                >
                    Resumen
                </button>
                <button
                    onClick={() => setActiveTab("calendario")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${activeTab === "calendario" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                >
                    <Calendar className="h-4 w-4" />
                    Calendario
                </button>
            </div>

            {activeTab === "calendario" && (
                <>
                    {/* Selector de mes */}
                    <div className="flex items-center justify-between gap-4">
                        <h3 className="text-lg font-semibold text-[var(--foreground)] capitalize">
                            {format(calendarDate, "MMMM yyyy", { locale: es })}
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCalendarDate((d) => subMonths(d, 1))}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] transition-colors hover:bg-[var(--accent)]"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setCalendarDate((d) => addMonths(d, 1))}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] transition-colors hover:bg-[var(--accent)]"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Cuadrícula del calendario */}
                    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
                        <table className="w-full min-w-[800px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                                    <th className="w-28 border-r border-[var(--border)] px-3 py-2.5 text-left text-xs font-medium text-[var(--muted)]">Habitación</th>
                                    {monthDays.map((d) => (
                                        <th key={d.toISOString()} className="min-w-[32px] px-1 py-2 text-center text-xs font-medium text-[var(--muted)]">
                                            {format(d, "d")}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ROOMS.map((roomNumber, roomIdx) => (
                                    <tr key={roomNumber} className="border-b border-[var(--border)] last:border-0">
                                        <td className="border-r border-[var(--border)] px-3 py-2 align-middle">
                                            <div className="flex items-center gap-2">
                                                <Home className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                                                <span className="font-medium text-[var(--foreground)]">Habitación {roomNumber}</span>
                                            </div>
                                        </td>
                                        {monthDays.map((day) => {
                                            const res = getReservationForDay(roomNumber, day);
                                            const span = isStartOfReservation(roomNumber, day) ? getReservationSpan(roomNumber, day) : 0;

                                            if (span > 0) {
                                                const colorIdx = reservations.findIndex((r) => r.room_number === roomNumber && r.check_in <= format(day, "yyyy-MM-dd") && r.check_out > format(day, "yyyy-MM-dd")) % RESERVATION_STYLES.length;
                                                return (
                                                    <td
                                                        key={day.toISOString()}
                                                        colSpan={span}
                                                        className="px-0.5 py-1 align-middle"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => res && setSelectedReservation(res)}
                                                            className={`min-h-[36px] w-full flex items-center justify-center rounded-lg px-2 py-1.5 text-xs font-semibold text-white truncate transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer ${RESERVATION_STYLES[colorIdx]}`}
                                                            title={`Ver detalles: ${res?.guest_name}`}
                                                        >
                                                            {res?.guest_name}
                                                        </button>
                                                    </td>
                                                );
                                            }
                                            if (res) return null; // celda ya cubierta por colspan

                                            return (
                                                <td key={day.toISOString()} className="min-w-[36px] px-0.5 py-1 align-middle">
                                                    <div className="flex h-[36px] w-full min-w-[32px] items-center justify-center rounded-lg border border-emerald-200/60 bg-emerald-50 text-emerald-600 font-semibold shadow-sm hover:bg-emerald-100 hover:border-emerald-300/80 hover:shadow transition-all cursor-pointer" title="Disponible - Click para reservar">
                                                        +
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === "resumen" && (
                <>
            {/* Filtros y búsqueda */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email o habitación..."
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2.5 pl-10 pr-4 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:shadow-md"
                    />
                </div>
                <CustomSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="Todos los estados"
                    options={[
                        { value: "pending", label: "Pendiente" },
                        { value: "confirmed", label: "Confirmada" },
                        { value: "checked_in", label: "Check-in" },
                        { value: "checked_out", label: "Check-out" },
                        { value: "cancelled", label: "Cancelada" },
                    ]}
                    className="min-w-[160px]"
                />
            </div>

            {/* Lista de reservas */}
            <div className="space-y-3">
                {reservations.map((reservation) => (
                    <div
                        key={reservation.id}
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-all hover:shadow-md"
                    >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 shadow-sm">
                                    <Calendar className="h-6 w-6 text-[var(--primary)]" />
                                </div>
                                <div className="flex-1 space-y-3">
                                    {/* Encabezado: Nombre y Estado */}
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="font-semibold text-[var(--foreground)]">{reservation.guest_name}</h3>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${statusColors[reservation.status]}`}>
                                            {statusLabels[reservation.status]}
                                        </span>
                                    </div>

                                    {/* Detalles en Grid */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-[var(--muted)] sm:flex sm:flex-wrap sm:gap-4 pointer-events-none">
                                        <div className="col-span-2 flex items-center gap-2 sm:col-span-auto">
                                            <Calendar className="h-4 w-4 shrink-0 text-[var(--muted)]/70" />
                                            <span>
                                                {formatDate(reservation.check_in)} - {formatDate(reservation.check_out)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-[var(--foreground)]/80">
                                                Hab. {reservation.room_number}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 shrink-0 text-[var(--muted)]/70" />
                                            <span>
                                                {reservation.guests} {reservation.guests === 1 ? 'huésped' : 'huéspedes'}
                                            </span>
                                        </div>
                                        <div className="col-span-2 sm:col-span-auto">
                                            <span>{reservation.nights} {reservation.nights === 1 ? 'noche' : 'noches'}</span>
                                        </div>
                                    </div>

                                    {/* Contacto */}
                                    <div className="flex flex-col gap-1 text-xs text-[var(--muted)] sm:flex-row sm:gap-3">
                                        <span className="truncate">{reservation.guest_email}</span>
                                        <span className="hidden sm:inline">·</span>
                                        <span>{reservation.guest_phone}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer: Precio y Acciones */}
                            <div className="mt-2 flex flex-col gap-3 border-t border-[var(--border)] pt-4 md:mt-0 md:w-auto md:border-0 md:pt-0 md:text-right">
                                <div className="flex items-center justify-between md:block">
                                    <span className="text-sm font-medium text-[var(--muted)] md:hidden">Total</span>
                                    <p className="text-lg font-bold text-[var(--foreground)]">{formatCLP(reservation.total_price)}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 md:flex md:justify-end">
                                    <button className="flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]">
                                        Cancelar
                                    </button>
                                    <button className="flex items-center justify-center rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[var(--primary)]/90">
                                        Ver detalles
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
                </>
            )}

            {/* Modal detalle de reserva */}
            {selectedReservation && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setSelectedReservation(null)}
                >
                    <div
                        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                                    {selectedReservation.guest_name}
                                </h3>
                                <span className={`inline-block mt-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[selectedReservation.status]}`}>
                                    {statusLabels[selectedReservation.status]}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedReservation(null)}
                                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-6 space-y-4">
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]/50 p-4 space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                                    <span className="text-[var(--foreground)] font-medium">Fechas</span>
                                </div>
                                <p className="text-sm text-[var(--muted)] pl-6">
                                    {formatDate(selectedReservation.check_in)} — {formatDate(selectedReservation.check_out)}
                                </p>
                                <p className="text-xs text-[var(--muted)] pl-6">
                                    {selectedReservation.nights} {selectedReservation.nights === 1 ? 'noche' : 'noches'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]/50 p-3">
                                    <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Habitación</p>
                                    <p className="mt-0.5 font-semibold text-[var(--foreground)]">Hab. {selectedReservation.room_number}</p>
                                    <p className="text-xs text-[var(--muted)]">{selectedReservation.room_type}</p>
                                </div>
                                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]/50 p-3">
                                    <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Huéspedes</p>
                                    <p className="mt-0.5 font-semibold text-[var(--foreground)]">
                                        {selectedReservation.guests} {selectedReservation.guests === 1 ? 'persona' : 'personas'}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]/50 p-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                                    <a href={`mailto:${selectedReservation.guest_email}`} className="text-[var(--primary)] hover:underline truncate">
                                        {selectedReservation.guest_email}
                                    </a>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                                    <a href={`tel:${selectedReservation.guest_phone}`} className="text-[var(--foreground)] hover:text-[var(--primary)] truncate">
                                        {selectedReservation.guest_phone}
                                    </a>
                                </div>
                            </div>

                            {selectedReservation.special_requests && (
                                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]/50 p-3">
                                    <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Solicitudes especiales</p>
                                    <p className="mt-1 text-sm text-[var(--foreground)]">{selectedReservation.special_requests}</p>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                                <span className="text-sm text-[var(--muted)]">Total</span>
                                <p className="text-xl font-bold text-[var(--foreground)]">{formatCLP(selectedReservation.total_price)}</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedReservation(null)}
                                    className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                                >
                                    Cerrar
                                </button>
                                <button
                                    type="button"
                                    className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                                >
                                    Ver detalles completos
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
