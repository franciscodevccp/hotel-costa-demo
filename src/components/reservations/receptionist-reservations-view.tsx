import { Calendar, Users, Clock, CheckCircle2, Plus } from "lucide-react";

interface Reservation {
    id: string;
    guest_name: string;
    room_number: string;
    room_type: string;
    check_in: string;
    check_out: string;
    status: "pending" | "confirmed" | "checked_in" | "checked_out";
    guests: number;
    check_in_time?: string;
    check_out_time?: string;
}

export function ReceptionistReservationsView() {
    // Datos de ejemplo
    const today = "2026-02-12";

    const reservations: Reservation[] = [
        {
            id: "1",
            guest_name: "María González",
            room_number: "102",
            room_type: "Double",
            check_in: "2026-02-12",
            check_out: "2026-02-15",
            status: "confirmed",
            guests: 2,
            check_in_time: "14:00",
        },
        {
            id: "2",
            guest_name: "Ana Martínez",
            room_number: "301",
            room_type: "Single",
            check_in: "2026-02-10",
            check_out: "2026-02-12",
            status: "checked_in",
            guests: 1,
            check_out_time: "11:00",
        },
        {
            id: "3",
            guest_name: "Carlos Ruiz",
            room_number: "204",
            room_type: "Suite",
            check_in: "2026-02-13",
            check_out: "2026-02-16",
            status: "confirmed",
            guests: 2,
            check_in_time: "15:00",
        },
    ];

    const checkInsToday = reservations.filter(r => r.check_in === today);
    const checkOutsToday = reservations.filter(r => r.check_out === today);
    const upcoming = reservations.filter(r => r.check_in > today && r.check_in <= "2026-02-19");

    return (
        <div className="space-y-6">
            {/* Header con botón */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Reservas</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">Gestiona check-ins y check-outs del día</p>
                </div>
                <button className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95">
                    <Plus className="h-4 w-4" />
                    Nueva Reserva
                </button>
            </div>

            {/* Resumen rápido */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--primary)]/10 p-5 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[var(--primary)]/20 p-2.5">
                            <Calendar className="h-5 w-5 text-[var(--primary)]" />
                        </div>
                        <p className="text-sm font-medium text-[var(--muted)]">Check-ins Hoy</p>
                    </div>
                    <p className="mt-3 text-4xl font-bold tracking-tight text-[var(--primary)]">{checkInsToday.length}</p>
                </div>
                <div className="rounded-xl border border-[var(--success)]/20 bg-gradient-to-br from-[var(--success)]/5 to-[var(--success)]/10 p-5 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[var(--success)]/20 p-2.5">
                            <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                        </div>
                        <p className="text-sm font-medium text-[var(--muted)]">Check-outs Hoy</p>
                    </div>
                    <p className="mt-3 text-4xl font-bold tracking-tight text-[var(--success)]">{checkOutsToday.length}</p>
                </div>
                <div className="rounded-xl border border-[var(--warning)]/20 bg-gradient-to-br from-[var(--warning)]/5 to-[var(--warning)]/10 p-5 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[var(--warning)]/20 p-2.5">
                            <Clock className="h-5 w-5 text-[var(--warning)]" />
                        </div>
                        <p className="text-sm font-medium text-[var(--muted)]">Próximas</p>
                    </div>
                    <p className="mt-3 text-4xl font-bold tracking-tight text-[var(--warning)]">{upcoming.length}</p>
                </div>
            </div>

            {/* Check-ins de hoy */}
            {checkInsToday.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Check-ins de Hoy</h3>
                    <div className="space-y-2">
                        {checkInsToday.map((reservation) => (
                            <div
                                key={reservation.id}
                                className="flex items-center justify-between rounded-xl border border-[var(--primary)]/30 bg-gradient-to-r from-[var(--primary)]/5 to-transparent p-4 shadow-sm transition-all hover:shadow-md"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/15 text-base font-semibold text-[var(--primary)] shadow-sm">
                                        {reservation.room_number}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-[var(--foreground)]">{reservation.guest_name}</p>
                                        <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                                            <span>{reservation.room_type}</span>
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3.5 w-3.5" />
                                                {reservation.guests}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                {reservation.check_in_time}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95">
                                    Check-in
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Check-outs de hoy */}
            {checkOutsToday.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Check-outs de Hoy</h3>
                    <div className="space-y-2">
                        {checkOutsToday.map((reservation) => (
                            <div
                                key={reservation.id}
                                className="flex items-center justify-between rounded-xl border border-[var(--success)]/30 bg-gradient-to-r from-[var(--success)]/5 to-transparent p-4 shadow-sm transition-all hover:shadow-md"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/15 text-base font-semibold text-[var(--success)] shadow-sm">
                                        {reservation.room_number}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-[var(--foreground)]">{reservation.guest_name}</p>
                                        <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                                            <span>{reservation.room_type}</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                {reservation.check_out_time}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button className="rounded-lg bg-[var(--success)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95">
                                    Check-out
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Próximas reservas */}
            {upcoming.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Próximas Reservas</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                        {upcoming.map((reservation) => (
                            <div
                                key={reservation.id}
                                className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm transition-all hover:shadow-md"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--muted)]/10 text-sm font-semibold text-[var(--foreground)]">
                                            {reservation.room_number}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-[var(--foreground)]">{reservation.guest_name}</p>
                                            <p className="text-xs text-[var(--muted)]">{reservation.check_in}</p>
                                        </div>
                                    </div>
                                    <button className="text-sm font-medium text-[var(--primary)] transition-colors hover:underline">
                                        Ver
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
