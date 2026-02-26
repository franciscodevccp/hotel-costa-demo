export type UserRole = "admin" | "receptionist";
export type RoomType = "single" | "double" | "twin" | "triple" | "quadruple" | "suite";
export type RoomStatus = "available" | "occupied" | "cleaning" | "maintenance";
export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";
export type PaymentMethod = "cash" | "debit" | "credit" | "transfer" | "other";
export type PaymentStatus = "completed" | "pending" | "refunded";

export interface Establishment {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  total_rooms: number;
  logo_url: string | null;
  created_at: string;
}

export interface User {
  id: string;
  auth_id: string | null;
  establishment_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Room {
  id: string;
  establishment_id: string;
  name: string;
  room_number: string;
  type: RoomType;
  price_per_night: number;
  status: RoomStatus;
  floor: number;
  has_private_bathroom: boolean;
  notes: string | null;
  created_at: string;
}

export interface Guest {
  id: string;
  establishment_id: string;
  full_name: string;
  rut: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  notes: string | null;
  created_at: string;
}

export interface Reservation {
  id: string;
  establishment_id: string;
  room_id: string;
  guest_id: string;
  created_by: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  status: ReservationStatus;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  establishment_id: string;
  reservation_id: string;
  registered_by: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  notes: string | null;
  paid_at: string;
}


