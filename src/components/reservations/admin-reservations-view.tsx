"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { createPortal, useFormStatus } from "react-dom";
import { Calendar, Search, Plus, Users, ChevronLeft, ChevronRight, Home, X, Mail, Phone } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { addMonths, subMonths, format, getDaysInMonth, startOfMonth, startOfDay, isWithinInterval, isSameDay, addDays, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { createReservation, updateReservationStatus, deleteReservation, type CreateReservationState } from "@/app/dashboard/reservations/actions";
import { createGuest, type CreateGuestState } from "@/app/dashboard/guests/actions";
import { SyncMotopressButton } from "./sync-motopress-button";
import { DatePickerInput } from "@/components/ui/date-picker-input";

export interface ReservationDisplay {
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
    paid_amount?: number;
    pending_amount?: number;
    nights: number;
    guests: number;
    special_requests?: string;
}

const RESERVATION_STYLES = [
    "bg-emerald-500 text-white shadow-sm border border-emerald-600/20",
    "bg-blue-500 text-white shadow-sm border border-blue-600/20",
    "bg-violet-500 text-white shadow-sm border border-violet-600/20",
];

type RoomOption = { id: string; roomNumber: string; pricePerNight: number };
type GuestOption = { id: string; fullName: string; email: string };

/** Formatea entrada como RUT chileno: 12.345.678-9. Máximo 8 dígitos + 1 dígito verificador. */
function formatChileanRut(value: string): string {
  const raw = value.replace(/[^0-9kK]/g, "").toUpperCase();
  if (!raw) return "";
  let bodyDigits = "";
  let dv = "";
  for (const c of raw) {
    if (/\d/.test(c) && bodyDigits.length < 8) {
      bodyDigits += c;
    } else if (bodyDigits.length === 8 && /[0-9kK]/.test(c)) {
      dv = c;
      break;
    }
  }
  const bodyFormatted = bodyDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dv ? `${bodyFormatted}-${dv}` : bodyFormatted;
}

const initialReservationState: CreateReservationState = {};
const initialGuestState: CreateGuestState = {};

function CrearReservaSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Creando…" : "Crear reserva"}
    </button>
  );
}

export function AdminReservationsView({
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
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState("");
    const [activeTab, setActiveTab] = useState<"resumen" | "calendario">("resumen");
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [selectedReservation, setSelectedReservation] = useState<ReservationDisplay | null>(null);
    const [newReservationOpen, setNewReservationOpen] = useState(false);
    const [reservationToDelete, setReservationToDelete] = useState<ReservationDisplay | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [newGuestId, setNewGuestId] = useState("");
    const [newRoomId, setNewRoomId] = useState("");
    const [newCheckIn, setNewCheckIn] = useState("");
    const [newCheckOut, setNewCheckOut] = useState("");
    const [newNumGuests, setNewNumGuests] = useState(1);
    const [newTotalAmount, setNewTotalAmount] = useState(0);
    const [newDownPayment, setNewDownPayment] = useState(0);
    const [newDownPaymentMethod, setNewDownPaymentMethod] = useState<"CASH" | "DEBIT" | "CREDIT" | "TRANSFER" | "OTHER">("CASH");
    const [newNotes, setNewNotes] = useState("");
    const [reservationState, reservationFormAction] = useActionState(createReservation, initialReservationState);
    const [localGuests, setLocalGuests] = useState<GuestOption[]>(guests);
    const [newGuestOpen, setNewGuestOpen] = useState(false);
    const [newGuestRut, setNewGuestRut] = useState("");
    const [newGuestPhone, setNewGuestPhone] = useState("+569");
    const [showEmergencyContact, setShowEmergencyContact] = useState(false);
    const [emergencyContactName, setEmergencyContactName] = useState("");
    const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
    const [guestState, guestFormAction] = useActionState(createGuest, initialGuestState);

    useEffect(() => {
      setLocalGuests(guests);
    }, [guests]);

    useEffect(() => {
      const g = guestState?.guest;
      if (g) {
        setLocalGuests((prev) =>
          prev.some((x) => x.id === g.id) ? prev : [...prev, g]
        );
        setNewGuestId(g.id);
        setNewGuestOpen(false);
        setNewGuestRut("");
        setNewGuestPhone("+569");
        setShowEmergencyContact(false);
        setEmergencyContactName("");
        setEmergencyContactPhone("");
      }
    }, [guestState?.guest]);

    useEffect(() => {
      if (newGuestOpen) {
        setNewGuestRut("");
        setNewGuestPhone("+569");
        setShowEmergencyContact(false);
        setEmergencyContactName("");
        setEmergencyContactPhone("");
      }
    }, [newGuestOpen]);

    const ROOMS = roomNumbers.length > 0 ? roomNumbers : Array.from(new Set(reservations.map((r) => r.room_number))).sort();
    const selectedRoom = rooms.find((r) => r.id === newRoomId);
    const nights = newCheckIn && newCheckOut ? Math.max(0, differenceInDays(new Date(newCheckOut), new Date(newCheckIn))) : 0;
    const calculatedTotal = selectedRoom ? selectedRoom.pricePerNight * nights : 0;

    useEffect(() => {
      if (reservationState?.success) {
        setNewReservationOpen(false);
        router.refresh();
      }
    }, [reservationState?.success, router]);

    useEffect(() => {
      if (newReservationOpen) {
        setNewGuestId("");
        setNewRoomId("");
        setNewCheckIn("");
        setNewCheckOut("");
        setNewNumGuests(1);
        setNewTotalAmount(0);
        setNewDownPayment(0);
        setNewDownPaymentMethod("CASH");
        setNewNotes("");
      }
    }, [newReservationOpen]);

    useEffect(() => {
      setNewTotalAmount(calculatedTotal);
    }, [calculatedTotal]);
    const filteredReservations = statusFilter
        ? reservations.filter((r) => r.status === statusFilter)
        : reservations;

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

    const parseLocalDateStr = (dateStr: string) => {
        const [y, m, d] = (dateStr || "").split("-").map(Number);
        return Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d) ? null : new Date(y, m - 1, d);
    };
    const formatDate = (dateString: string) => {
        const d = parseLocalDateStr(dateString);
        return d ? d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }) : dateString;
    };

    // Calendario: obtener reserva que incluye un día para una habitación (usar día local para evitar UTC)
    const getReservationForDay = (roomNumber: string, day: Date) => {
        return reservations.find((r) => {
            if (r.room_number !== roomNumber || r.status === "cancelled") return false;
            const start = parseLocalDateStr(r.check_in);
            const end = parseLocalDateStr(r.check_out);
            if (!start || !end) return false;
            return isWithinInterval(day, { start, end }) && !isSameDay(day, end);
        });
    };

    const isStartOfReservation = (roomNumber: string, day: Date) => {
        return reservations.some((r) => {
            if (r.room_number !== roomNumber || r.status === "cancelled") return false;
            const start = parseLocalDateStr(r.check_in);
            return start ? isSameDay(start, day) : false;
        });
    };

    const getReservationSpan = (roomNumber: string, day: Date) => {
        const r = reservations.find((r) => {
            if (r.room_number !== roomNumber || r.status === "cancelled") return false;
            const start = parseLocalDateStr(r.check_in);
            return start ? isSameDay(start, day) : false;
        });
        if (!r) return 0;
        const start = parseLocalDateStr(r.check_in);
        const end = parseLocalDateStr(r.check_out);
        if (!start || !end) return 0;
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <SyncMotopressButton />
                    <button
                        type="button"
                        onClick={() => setNewReservationOpen(true)}
                        className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 w-full md:w-auto"
                    >
                        <Plus className="h-4 w-4" />
                        Nueva Reserva
                    </button>
                </div>
            </div>

            {/* Modal Nueva Reserva */}
            {newReservationOpen &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/50 p-6"
                  style={{ minHeight: "100dvh" }}
                >
                  <div
                    className="flex w-full max-w-2xl max-h-[90dvh] min-h-[28rem] flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl"
                  >
                    <div className="shrink-0 border-b border-[var(--border)] px-6 py-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-[var(--foreground)]">Nueva reserva</h3>
                        <button
                          type="button"
                          onClick={() => setNewReservationOpen(false)}
                          className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--muted)]/20 hover:text-[var(--foreground)]"
                          aria-label="Cerrar"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <form action={reservationFormAction} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                    <div className="space-y-4">
                      {reservationState?.error && (
                        <p className="rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
                          {reservationState.error}
                        </p>
                      )}
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Huésped</label>
                        <div className="flex gap-2">
                          <select
                            name="guestId"
                            required
                            value={newGuestId}
                            onChange={(e) => setNewGuestId(e.target.value)}
                            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                          >
                            <option value="">Seleccionar huésped</option>
                            {localGuests.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.fullName} {g.email ? `(${g.email})` : ""}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setNewGuestOpen(true)}
                            className="shrink-0 rounded-lg border border-[var(--primary)] bg-[var(--primary)]/10 px-3 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20"
                          >
                            + Nuevo
                          </button>
                        </div>
                        {localGuests.length === 0 && (
                          <p className="mt-1.5 text-xs text-[var(--muted)]">
                            No hay huéspedes. Haz clic en &quot;+ Nuevo&quot; para crear uno.
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Habitación</label>
                        <select
                          name="roomId"
                          required
                          value={newRoomId}
                          onChange={(e) => setNewRoomId(e.target.value)}
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        >
                          <option value="">Seleccionar habitación</option>
                          {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              Hab. {r.roomNumber} – ${r.pricePerNight.toLocaleString("es-CL")}/noche
                            </option>
                          ))}
                        </select>
                      </div>
                      <input type="hidden" name="checkIn" value={newCheckIn} />
                      <input type="hidden" name="checkOut" value={newCheckOut} />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Check-in</label>
                          <DatePickerInput
                            value={newCheckIn}
                            onChange={setNewCheckIn}
                            placeholder="dd/mm/aaaa"
                            minDate={format(startOfDay(new Date()), "yyyy-MM-dd")}
                            aria-label="Fecha de check-in"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Check-out</label>
                          <DatePickerInput
                            value={newCheckOut}
                            onChange={setNewCheckOut}
                            placeholder="dd/mm/aaaa"
                            minDate={newCheckIn || format(startOfDay(new Date()), "yyyy-MM-dd")}
                            aria-label="Fecha de check-out"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Nº huéspedes</label>
                        <select
                          name="numGuests"
                          value={newNumGuests}
                          onChange={(e) => setNewNumGuests(parseInt(e.target.value, 10))}
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? "persona" : "personas"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Total (CLP)</label>
                        <input
                          type="text"
                          name="totalAmount"
                          inputMode="numeric"
                          value={newTotalAmount ? newTotalAmount.toLocaleString("es-CL") : ""}
                          onChange={(e) => setNewTotalAmount(parseInt(e.target.value.replace(/\D/g, ""), 10) || 0)}
                          placeholder="Se calcula por habitación y noches"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Abonado (CLP)</label>
                        <input
                          type="text"
                          name="downPayment"
                          inputMode="numeric"
                          value={newDownPayment ? newDownPayment.toLocaleString("es-CL") : ""}
                          onChange={(e) => setNewDownPayment(Math.max(0, parseInt(e.target.value.replace(/\D/g, ""), 10) || 0))}
                          placeholder="Monto que abona el cliente ahora"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                        <div className="mt-2">
                          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Método de pago</label>
                          <select
                            name="downPaymentMethod"
                            value={newDownPaymentMethod}
                            onChange={(e) => setNewDownPaymentMethod(e.target.value as "CASH" | "DEBIT" | "CREDIT" | "TRANSFER" | "OTHER")}
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                          >
                            <option value="CASH">Efectivo</option>
                            <option value="TRANSFER">Transferencia</option>
                            <option value="DEBIT">Débito</option>
                            <option value="CREDIT">Crédito</option>
                            <option value="OTHER">Otro</option>
                          </select>
                        </div>
                        {newTotalAmount > 0 && (
                          <p className="mt-1.5 text-xs text-[var(--muted)]">
                            Saldo pendiente: <span className="font-medium text-[var(--foreground)]">
                              ${Math.max(0, newTotalAmount - newDownPayment).toLocaleString("es-CL")}
                            </span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Notas (opcional)</label>
                        <textarea
                          name="notes"
                          value={newNotes}
                          onChange={(e) => setNewNotes(e.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      </div>
                    </div>
                    </div>
                    <div className="shrink-0 border-t border-[var(--border)] px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setNewReservationOpen(false)}
                          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/20"
                        >
                          Cancelar
                        </button>
                        <CrearReservaSubmitButton />
                      </div>
                    </div>
                    </form>
                  </div>
                </div>,
                document.body
              )}

            {/* Modal Nuevo huésped */}
            {newGuestOpen &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  className="fixed inset-0 z-[60] flex min-h-screen items-center justify-center overflow-y-auto bg-black/50 p-4"
                  style={{ minHeight: "100dvh" }}
                >
                  <div
                    className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--foreground)]">Nuevo huésped</h3>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          Se guardará en Gestión de Huéspedes y podrá usarse en futuras reservas.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewGuestOpen(false)}
                        className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--muted)]/20 hover:text-[var(--foreground)]"
                        aria-label="Cerrar"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <form action={guestFormAction} className="space-y-4">
                      {guestState?.error && (
                        <p className="rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
                          {guestState.error}
                        </p>
                      )}
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Nombre completo *</label>
                        <input
                          type="text"
                          name="fullName"
                          required
                          placeholder="Ej. Juan Pérez"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">RUT *</label>
                        <input
                          type="text"
                          name="rut"
                          required
                          inputMode="numeric"
                          autoComplete="off"
                          value={newGuestRut}
                          onChange={(e) => setNewGuestRut(formatChileanRut(e.target.value))}
                          placeholder="12.345.678-9"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Email *</label>
                        <input
                          type="email"
                          name="email"
                          required
                          placeholder="correo@ejemplo.com"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Teléfono *</label>
                        <input
                          type="tel"
                          name="phone"
                          required
                          value={newGuestPhone}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v.length <= 12) setNewGuestPhone(v);
                          }}
                          maxLength={12}
                          placeholder="+569 1234 5678"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      </div>
                      <div>
                        {!showEmergencyContact ? (
                          <button
                            type="button"
                            onClick={() => setShowEmergencyContact(true)}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/10 px-4 py-3 text-sm font-medium text-[var(--muted)] transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]"
                          >
                            <Plus className="h-4 w-4" />
                            Agregar contacto de emergencia
                          </button>
                        ) : (
                          <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/5 p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-[var(--foreground)]">Contacto de emergencia (opcional)</span>
                              <button
                                type="button"
                                onClick={() => setShowEmergencyContact(false)}
                                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                              >
                                Quitar
                              </button>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Nombre</label>
                              <input
                                type="text"
                                name="emergencyContactName"
                                value={emergencyContactName}
                                onChange={(e) => setEmergencyContactName(e.target.value)}
                                placeholder="Ej. María Pérez"
                                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Teléfono</label>
                              <input
                                type="tel"
                                name="emergencyContactPhone"
                                value={emergencyContactPhone}
                                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                                placeholder="+569 1234 5678"
                                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setNewGuestOpen(false)}
                          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/20"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
                        >
                          Crear huésped
                        </button>
                      </div>
                    </form>
                  </div>
                </div>,
                document.body
              )}

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
                {filteredReservations.map((reservation) => (
                    <div
                        key={reservation.id}
                        className="relative rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 pr-16 shadow-sm transition-all hover:shadow-md"
                    >
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setReservationToDelete(reservation); }}
                            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] shrink-0"
                            aria-label="Eliminar reserva"
                        >
                            <X className="h-5 w-5" />
                        </button>
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

                                <div className="grid grid-cols-2 gap-3 md:flex md:justify-end md:gap-3">
                                    {reservation.status === "pending" && (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const ok = await updateReservationStatus(reservation.id, "CONFIRMED");
                                                if (ok?.success) router.refresh();
                                            }}
                                            className="flex items-center justify-center rounded-lg border border-[var(--primary)] bg-[var(--primary)]/10 px-3 py-2 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/20"
                                        >
                                            Confirmar
                                        </button>
                                    )}
                                    {reservation.status !== "cancelled" && (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!confirm("¿Cancelar esta reserva? Esta acción no se puede deshacer.")) return;
                                                const ok = await updateReservationStatus(reservation.id, "CANCELLED");
                                                if (ok?.success) {
                                                    setSelectedReservation(null);
                                                    router.refresh();
                                                } else if (ok?.error) alert(ok.error);
                                            }}
                                            className="flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] hover:border-[var(--destructive)]/30"
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedReservation(reservation)}
                                        className="flex items-center justify-center rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[var(--primary)]/90"
                                    >
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

            {/* Modal confirmar eliminar reserva */}
            {reservationToDelete &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  className="fixed inset-0 z-[60] flex min-h-screen items-center justify-center bg-black/50 p-4"
                  onClick={() => setReservationToDelete(null)}
                >
                  <div
                    className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Eliminar reserva</h3>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Si elimina la reserva, se eliminará permanentemente y no podrá recuperarse. Los pagos asociados también se eliminarán.
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                      Reserva de <strong>{reservationToDelete.guest_name}</strong> · {formatCLP(reservationToDelete.total_price)}
                    </p>
                    <div className="mt-6 flex gap-3">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => !isDeleting && setReservationToDelete(null)}
                        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/20 disabled:opacity-50"
                      >
                        No, cancelar
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={async () => {
                          setIsDeleting(true);
                          try {
                            const ok = await deleteReservation(reservationToDelete.id);
                            if (ok?.success) {
                              const idDeleted = reservationToDelete.id;
                              setReservationToDelete(null);
                              setSelectedReservation((prev) => (prev?.id === idDeleted ? null : prev));
                              setIsDeleting(false);
                              // Refrescar tras un breve retraso para que el modal se cierre y no falle el re-render del servidor
                              setTimeout(() => router.refresh(), 100);
                            } else if (ok?.error) {
                              alert(ok.error);
                            }
                          } catch (err) {
                            const msg = err instanceof Error ? err.message : "Error al eliminar la reserva";
                            alert(msg);
                          } finally {
                            setIsDeleting(false);
                          }
                        }}
                        className="flex-1 rounded-lg bg-[var(--destructive)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {isDeleting ? "Eliminando…" : "Sí, eliminar"}
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
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

                            <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
                                {selectedReservation.paid_amount != null && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[var(--muted)]">Abonado</span>
                                        <p className="text-sm font-medium text-[var(--foreground)]">{formatCLP(selectedReservation.paid_amount)}</p>
                                    </div>
                                )}
                                {selectedReservation.pending_amount != null && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[var(--muted)]">Saldo pendiente</span>
                                        <p className={`text-sm font-medium ${selectedReservation.pending_amount > 0 ? "text-[var(--warning)]" : "text-[var(--foreground)]"}`}>
                                            {formatCLP(selectedReservation.pending_amount)}
                                        </p>
                                    </div>
                                )}
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-sm text-[var(--muted)]">Total</span>
                                    <p className="text-xl font-bold text-[var(--foreground)]">{formatCLP(selectedReservation.total_price)}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3 pt-2">
                                {selectedReservation.status === "pending" && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const ok = await updateReservationStatus(selectedReservation.id, "CONFIRMED");
                                            if (ok?.success) {
                                                setSelectedReservation(null);
                                                router.refresh();
                                            } else if (ok?.error) alert(ok.error);
                                        }}
                                        className="flex-1 min-w-[120px] rounded-lg border border-[var(--primary)] bg-[var(--primary)]/10 px-4 py-2.5 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20"
                                    >
                                        Confirmar reserva
                                    </button>
                                )}
                                {selectedReservation.status !== "cancelled" && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!confirm("¿Cancelar esta reserva? Esta acción no se puede deshacer.")) return;
                                            const ok = await updateReservationStatus(selectedReservation.id, "CANCELLED");
                                            if (ok?.success) {
                                                setSelectedReservation(null);
                                                router.refresh();
                                            } else if (ok?.error) alert(ok.error);
                                        }}
                                        className="flex-1 min-w-[120px] rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-2.5 text-sm font-medium text-[var(--destructive)] hover:bg-[var(--destructive)]/20"
                                    >
                                        Cancelar reserva
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setSelectedReservation(null)}
                                    className="flex-1 min-w-[100px] rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
