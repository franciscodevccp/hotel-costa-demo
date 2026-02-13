"use client";

import { useState } from "react";
import { BedDouble, Plus, Search } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";

interface Room {
    id: string;
    room_number: string;
    type: string;
    status: "available" | "occupied" | "cleaning" | "maintenance";
    floor: number;
    price_per_night: number;
}

export function AdminRoomsView() {
    const [statusFilter, setStatusFilter] = useState("");
    // Datos de ejemplo
    const rooms: Room[] = [
        { id: "1", room_number: "101", type: "Single", status: "available", floor: 1, price_per_night: 35000 },
        { id: "2", room_number: "102", type: "Double", status: "occupied", floor: 1, price_per_night: 50000 },
        { id: "3", room_number: "103", type: "Double", status: "cleaning", floor: 1, price_per_night: 50000 },
        { id: "4", room_number: "201", type: "Suite", status: "available", floor: 2, price_per_night: 85000 },
        { id: "5", room_number: "202", type: "Twin", status: "maintenance", floor: 2, price_per_night: 55000 },
        { id: "6", room_number: "203", type: "Double", status: "available", floor: 2, price_per_night: 50000 },
    ];

    const statusColors = {
        available: "bg-[var(--success)]/10 text-[var(--success)]",
        occupied: "bg-[var(--primary)]/10 text-[var(--primary)]",
        cleaning: "bg-[var(--warning)]/10 text-[var(--warning)]",
        maintenance: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
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

    return (
        <div className="space-y-6">
            {/* Header con acciones */}
            {/* Header con acciones */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Gestión de Habitaciones</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">Administra todas las habitaciones del establecimiento</p>
                </div>
                <button className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 w-full md:w-auto">
                    <Plus className="h-4 w-4" />
                    Nueva Habitación
                </button>
            </div>

            {/* Barra de búsqueda y filtros */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                    <input
                        type="text"
                        placeholder="Buscar por número de habitación..."
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2.5 pl-10 pr-4 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:shadow-md"
                    />
                </div>
                <CustomSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="Todos los estados"
                    options={[
                        { value: "available", label: "Disponible" },
                        { value: "occupied", label: "Ocupada" },
                        { value: "cleaning", label: "Limpieza" },
                        { value: "maintenance", label: "Mantenimiento" },
                    ]}
                    className="min-w-[160px]"
                />
            </div>

            {/* Grid de habitaciones */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => (
                    <div
                        key={room.id}
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--primary)]/10 shadow-sm">
                                    <BedDouble className="h-6 w-6 text-[var(--primary)]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[var(--foreground)]">Hab. {room.room_number}</h3>
                                    <p className="text-sm text-[var(--muted)]">{room.type} · Piso {room.floor}</p>
                                </div>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${statusColors[room.status]}`}>
                                {statusLabels[room.status]}
                            </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
                            <span className="text-sm font-semibold text-[var(--foreground)]">
                                {formatCLP(room.price_per_night)}/noche
                            </span>
                            <button className="text-sm font-medium text-[var(--primary)] transition-colors hover:underline">
                                Editar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
