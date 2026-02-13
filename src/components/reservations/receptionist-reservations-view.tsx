"use client";

import { AdminReservationsView } from "./admin-reservations-view";

/**
 * Vista de reservas para recepcionista.
 * Utiliza el mismo componente que admin para mantener la interfaz idéntica:
 * - Tabs Resumen / Calendario
 * - Calendario interactivo con habitaciones y días
 * - Bloques de reserva clickeables con modal de detalles
 * - Lista completa de reservas con filtros
 */
export function ReceptionistReservationsView() {
    return <AdminReservationsView />;
}
