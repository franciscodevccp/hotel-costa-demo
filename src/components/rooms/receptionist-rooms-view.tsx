import { BedDouble, Search } from "lucide-react";

interface Room {
    id: string;
    room_number: string;
    type: string;
    status: "available" | "occupied" | "cleaning" | "maintenance";
    floor: number;
    price_per_night: number;
}

export function ReceptionistRoomsView() {
    // Datos de ejemplo - solo habitaciones disponibles y ocupadas
    const rooms: Room[] = [
        { id: "1", room_number: "101", type: "Single", status: "available", floor: 1, price_per_night: 35000 },
        { id: "2", room_number: "102", type: "Double", status: "occupied", floor: 1, price_per_night: 50000 },
        { id: "4", room_number: "201", type: "Suite", status: "available", floor: 2, price_per_night: 85000 },
        { id: "6", room_number: "203", type: "Double", status: "available", floor: 2, price_per_night: 50000 },
    ];

    const statusColors = {
        available: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
        occupied: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20",
        cleaning: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
        maintenance: "bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]/20",
    };

    const statusLabels = {
        available: "Disponible",
        occupied: "Ocupada",
        cleaning: "Limpieza",
        maintenance: "Mantenimiento",
    };

    const formatCLP = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const availableRooms = rooms.filter(r => r.status === "available");
    const occupiedRooms = rooms.filter(r => r.status === "occupied");

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Habitaciones</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Consulta disponibilidad y asigna habitaciones</p>
            </div>

            {/* Resumen rápido con diseño mejorado */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[var(--success)]/20 bg-gradient-to-br from-[var(--success)]/5 to-[var(--success)]/10 p-5 shadow-sm transition-shadow hover:shadow-md">
                    <p className="text-sm font-medium text-[var(--muted)]">Disponibles</p>
                    <p className="mt-2 text-4xl font-bold tracking-tight text-[var(--success)]">{availableRooms.length}</p>
                </div>
                <div className="rounded-xl border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--primary)]/10 p-5 shadow-sm transition-shadow hover:shadow-md">
                    <p className="text-sm font-medium text-[var(--muted)]">Ocupadas</p>
                    <p className="mt-2 text-4xl font-bold tracking-tight text-[var(--primary)]">{occupiedRooms.length}</p>
                </div>
            </div>

            {/* Barra de búsqueda */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                    type="text"
                    placeholder="Buscar habitación..."
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2.5 pl-10 pr-4 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:shadow-md"
                />
            </div>

            {/* Lista de habitaciones */}
            <div className="space-y-5">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Habitaciones Disponibles</h3>
                <div className="grid gap-3 md:grid-cols-2">
                    {availableRooms.map((room) => (
                        <div
                            key={room.id}
                            className={`rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${statusColors[room.status]}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-[var(--success)]/20 p-2">
                                        <BedDouble className="h-5 w-5 text-[var(--success)]" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-[var(--foreground)]">Habitación {room.room_number}</p>
                                        <p className="text-sm text-[var(--muted)]">{room.type} · Piso {room.floor}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-[var(--foreground)]">{formatCLP(room.price_per_night)}</p>
                                    <button className="mt-1 text-sm font-medium text-[var(--success)] transition-colors hover:underline">
                                        Asignar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <h3 className="mt-6 text-lg font-semibold text-[var(--foreground)]">Habitaciones Ocupadas</h3>
                <div className="grid gap-3 md:grid-cols-2">
                    {occupiedRooms.map((room) => (
                        <div
                            key={room.id}
                            className={`rounded-xl border p-4 shadow-sm ${statusColors[room.status]}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-[var(--primary)]/20 p-2">
                                        <BedDouble className="h-5 w-5 text-[var(--primary)]" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-[var(--foreground)]">Habitación {room.room_number}</p>
                                        <p className="text-sm text-[var(--muted)]">{room.type} · Piso {room.floor}</p>
                                    </div>
                                </div>
                                <span className="rounded-full bg-[var(--primary)]/20 px-3 py-1 text-xs font-medium text-[var(--primary)]">
                                    Ocupada
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
