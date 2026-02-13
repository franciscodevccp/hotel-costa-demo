import { Search, Plus, Mail, Phone, MapPin, Calendar, Bed, UserPlus } from "lucide-react";

interface Guest {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    nationality: string;
    status: "active" | "checked_out";
    current_room?: string;
    check_in_date?: string;
    check_out_date?: string;
}

export function ReceptionistGuestsView() {
    // Datos de ejemplo
    const guests: Guest[] = [
        {
            id: "1",
            full_name: "María González",
            email: "maria@example.com",
            phone: "+56912345678",
            nationality: "Chile",
            status: "active",
            current_room: "102",
            check_in_date: "2026-02-12",
            check_out_date: "2026-02-15",
        },
        {
            id: "2",
            full_name: "Carlos Ruiz",
            email: "carlos@example.com",
            phone: "+56923456789",
            nationality: "Argentina",
            status: "active",
            current_room: "204",
            check_in_date: "2026-02-13",
            check_out_date: "2026-02-16",
        },
        {
            id: "3",
            full_name: "Ana Martínez",
            email: "ana@example.com",
            phone: "+56934567890",
            nationality: "Chile",
            status: "checked_out",
        },
    ];

    const activeGuests = guests.filter(g => g.status === "active");
    const recentGuests = guests.filter(g => g.status === "checked_out");

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CL', {
            day: '2-digit',
            month: 'short',
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Huéspedes</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">Gestiona la información de huéspedes</p>
                </div>
                <button className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95">
                    <Plus className="h-4 w-4" />
                    Nuevo Huésped
                </button>
            </div>

            {/* Resumen: distingue "con habitación" vs "solo registrados" */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="rounded-xl border border-[var(--success)]/20 bg-gradient-to-br from-[var(--success)]/5 to-[var(--success)]/10 p-3 md:p-5 shadow-sm">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="rounded-lg bg-[var(--success)]/20 p-2 md:p-2.5">
                            <Bed className="h-4 w-4 md:h-5 md:w-5 text-[var(--success)]" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs md:text-sm font-medium text-[var(--foreground)] truncate">En alojamiento</p>
                            <p className="hidden md:block text-xs text-[var(--muted)]">Con habitación asignada ahora</p>
                        </div>
                    </div>
                    <p className="mt-2 md:mt-3 text-2xl md:text-4xl font-bold tracking-tight text-[var(--success)]">{activeGuests.length}</p>
                </div>
                <div className="rounded-xl border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--primary)]/10 p-3 md:p-5 shadow-sm">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="rounded-lg bg-[var(--primary)]/20 p-2 md:p-2.5">
                            <UserPlus className="h-4 w-4 md:h-5 md:w-5 text-[var(--primary)]" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs md:text-sm font-medium text-[var(--foreground)] truncate">Registrados</p>
                            <p className="hidden md:block text-xs text-[var(--muted)]">En el sistema (con o sin habitación)</p>
                        </div>
                    </div>
                    <p className="mt-2 md:mt-3 text-2xl md:text-4xl font-bold tracking-tight text-[var(--primary)]">{guests.length}</p>
                </div>
            </div>

            {/* Búsqueda */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, email o teléfono..."
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2.5 pl-10 pr-4 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:shadow-md"
                />
            </div>

            {/* Huéspedes con habitación asignada (en alojamiento) */}
            {activeGuests.length > 0 && (
                <div className="space-y-3">
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--foreground)]">En alojamiento</h3>
                        <p className="text-sm text-[var(--muted)]">Huéspedes con habitación asignada en este momento</p>
                    </div>
                    <div className="space-y-2">
                        {activeGuests.map((guest) => (
                            <div
                                key={guest.id}
                                className="rounded-xl border border-[var(--success)]/30 bg-gradient-to-r from-[var(--success)]/5 to-transparent p-4 shadow-sm transition-all hover:shadow-md"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/15 text-base font-semibold text-[var(--success)] shadow-sm">
                                            {guest.current_room}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-[var(--foreground)]">{guest.full_name}</p>
                                            <div className="grid gap-1.5 text-sm text-[var(--muted)]">
                                                <span className="flex items-center gap-1.5">
                                                    <Mail className="h-3.5 w-3.5" />
                                                    {guest.email}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Phone className="h-3.5 w-3.5" />
                                                    {guest.phone}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {guest.nationality}
                                                </span>
                                                <span className="flex items-center gap-1.5 text-[var(--success)]">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {formatDate(guest.check_in_date!)} - {formatDate(guest.check_out_date!)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="text-sm font-medium text-[var(--primary)] transition-colors hover:underline">
                                        Ver detalles
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Registrados sin habitación actual */}
            {recentGuests.length > 0 && (
                <div className="space-y-3">
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--foreground)]">Registrados sin habitación actual</h3>
                        <p className="text-sm text-[var(--muted)]">En el sistema pero sin estancia activa (ya se fueron o solo registrados para futuras reservas)</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        {recentGuests.map((guest) => (
                            <div
                                key={guest.id}
                                className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm transition-all hover:shadow-md"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-medium text-[var(--foreground)]">{guest.full_name}</p>
                                        <div className="mt-1 space-y-0.5 text-xs text-[var(--muted)]">
                                            <p className="flex items-center gap-1">
                                                <Mail className="h-3 w-3" />
                                                {guest.email}
                                            </p>
                                            <p className="flex items-center gap-1">
                                                <Phone className="h-3 w-3" />
                                                {guest.phone}
                                            </p>
                                        </div>
                                    </div>
                                    <button className="text-xs font-medium text-[var(--primary)] transition-colors hover:underline">
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
