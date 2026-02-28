"use client";

import { AdminReservationsView } from "./admin-reservations-view";
import type { ReservationDisplay } from "./admin-reservations-view";

type RoomOption = { id: string; roomNumber: string; pricePerNight: number };
type GuestOption = { id: string; fullName: string; email: string; type?: "PERSON" | "COMPANY" };

export function ReceptionistReservationsView({
  reservations,
  roomNumbers,
  rooms,
  guests,
}: {
  reservations: ReservationDisplay[];
  roomNumbers: string[];
  rooms: RoomOption[];
  guests: GuestOption[];
}) {
  return (
    <AdminReservationsView
      reservations={reservations}
      roomNumbers={roomNumbers}
      rooms={rooms}
      guests={guests}
    />
  );
}
