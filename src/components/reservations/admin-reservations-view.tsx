"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { createPortal } from "react-dom";
import { Calendar, Search, Plus, Users, ChevronLeft, ChevronRight, Home, X, Mail, Phone, ImagePlus } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { addMonths, subMonths, format, getDaysInMonth, startOfMonth, startOfDay, isWithinInterval, isSameDay, addDays, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { createReservationsBulk, updateReservationStatus, deleteReservation, updateReservationEntryCard, type CreateReservationsBulkState } from "@/app/dashboard/reservations/actions";
import { createGuest, type CreateGuestState } from "@/app/dashboard/guests/actions";
import { SyncMotopressButton } from "./sync-motopress-button";
import { DatePickerInput } from "@/components/ui/date-picker-input";

export interface ReservationDisplay {
    id: string;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_type?: "PERSON" | "COMPANY";
    room_number: string;
    room_type: string;
    check_in: string;
    check_out: string;
    status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
    total_price: number;
    paid_amount?: number;
    pending_amount?: number;
    nights: number;
    guests: number;
    payment_term_days?: number | null;
    special_requests?: string;
    folio_number?: string;
    processed_by_name?: string;
    entry_card_image_url?: string;
}

/** Estilos del calendario por estado de reserva (colores bien diferenciados entre sí) */
const CALENDAR_STATUS_STYLES: Record<ReservationDisplay["status"], string> = {
    pending: "bg-yellow-400 text-slate-900 shadow-sm border-2 border-yellow-500/50",
    confirmed: "bg-blue-500 text-white shadow-sm border-2 border-blue-600/40",
    checked_in: "bg-emerald-600 text-white shadow-sm border-2 border-emerald-700/40",
    checked_out: "bg-slate-500 text-white shadow-sm border-2 border-slate-600/40",
    cancelled: "bg-red-500 text-white shadow-sm border-2 border-red-600/40",
    no_show: "bg-violet-600 text-white shadow-sm border-2 border-violet-700/40",
};

type RoomOption = { id: string; roomNumber: string; pricePerNight: number };
type GuestOption = { id: string; fullName: string; email: string; type?: "PERSON" | "COMPANY" };

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

type RoomLine = { roomId: string; numGuests: number };
const initialReservationState: CreateReservationsBulkState = {};
const initialGuestState: CreateGuestState = {};

function CrearReservaSubmitButton({ disabled, loading }: { disabled?: boolean; loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? "Creando…" : "Crear reserva"}
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
    const [confirmModal, setConfirmModal] = useState<{ type: "no_show" | "cancel"; reservation: ReservationDisplay } | null>(null);
    const [newGuestId, setNewGuestId] = useState("");
    const [roomLines, setRoomLines] = useState<RoomLine[]>([{ roomId: "", numGuests: 1 }]);
    const [newCheckIn, setNewCheckIn] = useState("");
    const [newCheckOut, setNewCheckOut] = useState("");
    const [newTotalAmount, setNewTotalAmount] = useState(0);
    const [newDownPayment, setNewDownPayment] = useState(0);
    const [newDownPaymentMethod, setNewDownPaymentMethod] = useState<"CASH" | "DEBIT" | "CREDIT" | "TRANSFER" | "OTHER" | "PURCHASE_ORDER">("CASH");
    const [newPaymentTermDays, setNewPaymentTermDays] = useState<number>(0);
    const [newNotes, setNewNotes] = useState("");
    const [newFolioNumber, setNewFolioNumber] = useState("");
    const [newProcessedByName, setNewProcessedByName] = useState("");
    const [receptionistDropdownOpen, setReceptionistDropdownOpen] = useState(false);
    const [reservationState, setReservationState] = useState<CreateReservationsBulkState>(initialReservationState);
    const receptionistNamesList = Array.from(new Set(reservations.map((r) => r.processed_by_name).filter(Boolean)) as Set<string>).sort((a, b) => a.localeCompare(b, "es"));
    const normalizeForSearch = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
    const receptionistFiltered = newProcessedByName.trim()
      ? receptionistNamesList.filter((name) => normalizeForSearch(name).includes(normalizeForSearch(newProcessedByName)))
      : receptionistNamesList;
    const [entryCardUrlOverride, setEntryCardUrlOverride] = useState<Record<string, string>>({});
    const [uploadingEntryCard, setUploadingEntryCard] = useState(false);
    const [entryCardPreviewUrl, setEntryCardPreviewUrl] = useState<string | null>(null);
    const [bulkSaving, setBulkSaving] = useState(false);
    const [localGuests, setLocalGuests] = useState<GuestOption[]>(guests);
    const [newGuestOpen, setNewGuestOpen] = useState(false);
    const [newGuestRut, setNewGuestRut] = useState("");
    const [newGuestPhone, setNewGuestPhone] = useState("+569");
    const [showEmergencyContact, setShowEmergencyContact] = useState(false);
    const [emergencyContactName, setEmergencyContactName] = useState("");
    const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
    const [newGuestType, setNewGuestType] = useState<"PERSON" | "COMPANY">("PERSON");
    const [newGuestCompanyRut, setNewGuestCompanyRut] = useState("");
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
        setNewGuestCompanyRut("");
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

    // Si cambia a huésped persona y tenía Orden de compra, volver a método normal
    useEffect(() => {
      const selected = localGuests.find((g) => g.id === newGuestId);
      if (selected?.type !== "COMPANY" && newDownPaymentMethod === "PURCHASE_ORDER") {
        setNewDownPaymentMethod("CASH");
        setNewPaymentTermDays(0);
      }
    }, [newGuestId, localGuests, newDownPaymentMethod]);

    // Habitaciones disponibles: si hay fechas, las que no tienen reserva en ese rango; si no hay fechas, las que no están ocupadas hoy
    const todayStr = format(startOfDay(new Date()), "yyyy-MM-dd");
    const availableRooms = (() => {
      const isActiveReservation = (r: ReservationDisplay) =>
        r.status !== "cancelled" && r.status !== "checked_out" && r.status !== "no_show";
      const sameRoom = (room: RoomOption, r: ReservationDisplay) =>
        String(room.roomNumber) === String(r.room_number);

      if (newCheckIn && newCheckOut) {
        return rooms.filter((room) => {
          const hasBlocking = reservations.some(
            (r) =>
              isActiveReservation(r) &&
              sameRoom(room, r) &&
              r.check_in < newCheckOut! &&
              r.check_out > newCheckIn!
          );
          return !hasBlocking;
        });
      }
      // Sin fechas: ocultar habitaciones ocupadas hoy (para no mostrar Hab. 1 si ya tiene reserva hoy)
      return rooms.filter((room) => {
        const occupiedToday = reservations.some(
          (r) =>
            isActiveReservation(r) &&
            sameRoom(room, r) &&
            r.check_in <= todayStr &&
            r.check_out > todayStr
        );
        return !occupiedToday;
      });
    })();

    const ROOMS = roomNumbers.length > 0 ? roomNumbers : Array.from(new Set(reservations.map((r) => r.room_number))).sort();
    const nights = newCheckIn && newCheckOut ? Math.max(0, differenceInDays(new Date(newCheckOut), new Date(newCheckIn))) : 0;

    // Para cada línea, habitaciones disponibles = las globales menos las ya elegidas en otras líneas
    const availableRoomsForLine = (lineIndex: number) =>
      availableRooms.filter(
        (r) => !roomLines.some((l, i) => i !== lineIndex && l.roomId === r.id)
      );

    const calculatedTotal = roomLines.reduce((sum, line) => {
      if (!line.roomId) return sum;
      const room = rooms.find((r) => r.id === line.roomId);
      return sum + (room ? room.pricePerNight * nights : 0);
    }, 0);

    useEffect(() => {
      if (reservationState?.success) {
        setNewReservationOpen(false);
        router.refresh();
      }
    }, [reservationState?.success, router]);

    useEffect(() => {
      if (newReservationOpen) {
        setNewGuestId("");
        setRoomLines([{ roomId: "", numGuests: 1 }]);
        setNewCheckIn("");
        setNewCheckOut("");
        setNewTotalAmount(0);
        setNewDownPayment(0);
        setNewDownPaymentMethod("CASH");
        setNewNotes("");
        setReservationState({});
      }
    }, [newReservationOpen]);

    // Al borrar fechas, limpiar selección de habitaciones para no mostrar opciones duplicadas/inconsistentes
    useEffect(() => {
      if (!newCheckIn || !newCheckOut) {
        setRoomLines((prev) => prev.map((l) => ({ ...l, roomId: "" })));
      }
    }, [newCheckIn, newCheckOut]);

    useEffect(() => {
      const singleRoom = roomLines.length === 1 && roomLines[0]?.roomId;
      setNewTotalAmount((prev) => {
        if (!singleRoom) return calculatedTotal;
        return prev === 0 || prev === calculatedTotal ? calculatedTotal : prev;
      });
    }, [calculatedTotal, roomLines.length, roomLines[0]?.roomId]);
    const filteredReservations = statusFilter
        ? reservations.filter((r) => r.status === statusFilter)
        : reservations;

    const statusColors = {
        pending: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
        confirmed: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20",
        checked_in: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
        checked_out: "bg-[var(--muted)]/10 text-[var(--muted)] border-[var(--muted)]/20",
        cancelled: "bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]/20",
        no_show: "bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]/20",
    };

    const statusLabels = {
        pending: "Pendiente",
        confirmed: "Confirmada",
        checked_in: "Check-in realizado",
        checked_out: "Check-out realizado",
        cancelled: "Cancelada",
        no_show: "No se presentó",
    };

    /** Estado de pago de la reserva: texto y clase para la etiqueta. Solo para reservas no canceladas. */
    const getPaymentStatus = (r: ReservationDisplay): { label: string; className: string } | null => {
        if (r.status === "cancelled") return null;
        const paid = r.paid_amount ?? 0;
        const pending = r.pending_amount ?? Math.max(0, (r.total_price ?? 0) - paid);
        if (pending <= 0 || paid >= (r.total_price ?? 0)) {
            return { label: "Pagado", className: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20" };
        }
        if (paid > 0) {
            return { label: "Pago parcial", className: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20" };
        }
        return { label: "Pendiente de pago", className: "bg-[var(--muted)]/20 text-[var(--muted)] border-[var(--muted)]/30" };
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
            if (r.room_number !== roomNumber) return false;
            const start = parseLocalDateStr(r.check_in);
            const end = parseLocalDateStr(r.check_out);
            if (!start || !end) return false;
            return isWithinInterval(day, { start, end }) && !isSameDay(day, end);
        });
    };

    /** Primer día de la reserva visible en este mes (check-in real o día 1 si empezó antes) */
    const isDisplayStartOfReservation = (roomNumber: string, day: Date) => {
        const res = getReservationForDay(roomNumber, day);
        if (!res) return false;
        const start = parseLocalDateStr(res.check_in);
        const monthStart = startOfMonth(calendarDate);
        const firstDayInMonth = start && start < monthStart ? monthStart : start;
        return firstDayInMonth ? isSameDay(day, firstDayInMonth) : false;
    };

    const getReservationSpan = (roomNumber: string, day: Date) => {
        const r = getReservationForDay(roomNumber, day);
        if (!r) return 0;
        const start = parseLocalDateStr(r.check_in);
        const end = parseLocalDateStr(r.check_out);
        if (!start || !end) return 0;
        const monthStart = startOfMonth(calendarDate);
        const monthEnd = addDays(startOfMonth(calendarDate), getDaysInMonth(calendarDate) - 1);
        const effectiveStart = start < monthStart ? monthStart : start;
        const effectiveEnd = end > monthEnd ? monthEnd : addDays(end, -1);
        if (day < effectiveStart || day > effectiveEnd) return 0;
        return differenceInDays(effectiveEnd, day) + 1;
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
                    <form
                      className="flex min-h-0 flex-1 flex-col"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newFolioNumber?.trim()) {
                          setReservationState({ error: "Indique el número de folio (tarjeta de ingreso)" });
                          return;
                        }
                        if (!newProcessedByName?.trim()) {
                          setReservationState({ error: "Indique el nombre del recepcionista que gestiona la reserva" });
                          return;
                        }
                        if (!newGuestId) {
                          setReservationState({ error: "Seleccione un huésped" });
                          return;
                        }
                        const validLines = roomLines.filter((l) => l.roomId && l.numGuests >= 1);
                        if (validLines.length === 0) {
                          setReservationState({ error: "Agregue al menos una habitación e indique huéspedes" });
                          return;
                        }
                        if (!newCheckIn || !newCheckOut) {
                          setReservationState({ error: "Indique fechas de check-in y check-out" });
                          return;
                        }
                        setBulkSaving(true);
                        setReservationState({});
                        const result = await createReservationsBulk({
                          guestId: newGuestId,
                          checkIn: newCheckIn,
                          checkOut: newCheckOut,
                          rooms: validLines,
                          downPayment: newDownPayment,
                          downPaymentMethod: newDownPaymentMethod,
                          paymentTermDays: newDownPaymentMethod === "PURCHASE_ORDER" && newPaymentTermDays >= 1 ? newPaymentTermDays : undefined,
                          notes: newNotes || undefined,
                          customTotalAmount: newTotalAmount > 0 ? newTotalAmount : undefined,
                          folioNumber: newFolioNumber.trim(),
                          processedByName: newProcessedByName.trim(),
                        });
                        setBulkSaving(false);
                        if (result.error) {
                          setReservationState({ error: result.error });
                        } else {
                          setReservationState({ success: true, created: result.created });
                          router.refresh();
                        }
                      }}
                    >
                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                    <div className="space-y-4">
                      {reservationState?.error && (
                        <p className="rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
                          {reservationState.error}
                        </p>
                      )}
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Nº de folio (tarjeta de ingreso) *</label>
                        <input
                          type="text"
                          value={newFolioNumber}
                          onChange={(e) => setNewFolioNumber(e.target.value)}
                          placeholder="Ej. 000002"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                          aria-required
                        />
                        <p className="mt-0.5 text-xs text-[var(--muted)]">Número que figura en la tarjeta de ingreso en papel.</p>
                      </div>
                      <div className="relative">
                        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Recepcionista que gestiona la reserva *</label>
                        <input
                          type="text"
                          value={newProcessedByName}
                          onChange={(e) => {
                            setNewProcessedByName(e.target.value);
                            setReceptionistDropdownOpen(true);
                          }}
                          onFocus={() => setReceptionistDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setReceptionistDropdownOpen(false), 180)}
                          placeholder="Ej. María González"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                          aria-required
                          aria-expanded={receptionistDropdownOpen}
                          aria-autocomplete="list"
                          aria-controls="receptionist-list"
                          id="receptionist-input"
                        />
                        {receptionistDropdownOpen && receptionistNamesList.length > 0 && (
                          <ul
                            id="receptionist-list"
                            role="listbox"
                            className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg"
                          >
                            {receptionistFiltered.length === 0 ? (
                              <li className="px-3 py-2 text-sm text-[var(--muted)]">Ningún trabajador coincide. Puede escribir un nombre nuevo.</li>
                            ) : (
                              receptionistFiltered.map((name) => (
                                <li
                                  key={name}
                                  role="option"
                                  className="cursor-pointer px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--primary)]/10"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setNewProcessedByName(name);
                                    setReceptionistDropdownOpen(false);
                                  }}
                                >
                                  {name}
                                </li>
                              ))
                            )}
                          </ul>
                        )}
                        <p className="mt-0.5 text-xs text-[var(--muted)]">Seleccione de la lista o escriba un nombre. La búsqueda ignora tildes (ej. &quot;andres&quot; encuentra &quot;Andrés&quot;).</p>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Huésped</label>
                        <div className="flex gap-2">
                          <div className="flex-1 min-w-0">
                            <CustomSelect
                              value={newGuestId}
                              onChange={setNewGuestId}
                              options={localGuests.map((g) => ({
                                value: g.id,
                                label: `${g.fullName}${g.email ? ` (${g.email})` : ""} — ${g.type === "COMPANY" ? "Empresa" : "Persona"}`,
                              }))}
                              placeholder="Seleccionar huésped"
                              aria-label="Seleccionar huésped"
                            />
                            <input type="hidden" name="guestId" value={newGuestId} />
                          </div>
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
                        <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Habitaciones</label>
                        <p className="mb-2 text-xs text-[var(--muted)]">
                          {newCheckIn && newCheckOut
                            ? "Agregue una o más habitaciones disponibles para las fechas elegidas e indique cuántas personas en cada una."
                            : "Indique primero las fechas de check-in y check-out para ver las habitaciones disponibles."}
                        </p>
                        {roomLines.map((line, index) => (
                          <div
                            key={index}
                            className={`mb-3 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border)] p-3 sm:gap-4 ${!newCheckIn || !newCheckOut ? "bg-[var(--muted)]/10 opacity-90" : "bg-[var(--background)]/50"}`}
                          >
                            <div className="min-w-0 flex-1 basis-48">
                              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Habitación</label>
                              <CustomSelect
                                value={line.roomId}
                                onChange={(v) =>
                                  setRoomLines((prev) =>
                                    prev.map((l, i) => (i === index ? { ...l, roomId: v } : l))
                                  )
                                }
                                options={
                                  newCheckIn && newCheckOut
                                    ? availableRoomsForLine(index).map((r) => ({
                                        value: r.id,
                                        label: `Hab. ${r.roomNumber} – ${r.pricePerNight.toLocaleString("es-CL")}/noche`,
                                      }))
                                    : []
                                }
                                placeholder={
                                  newCheckIn && newCheckOut
                                    ? "Seleccionar"
                                    : "Indique fechas para ver habitaciones disponibles"
                                }
                                aria-label={`Habitación ${index + 1}`}
                              />
                            </div>
                            <div className="min-w-[7.5rem] shrink-0 sm:min-w-[8.5rem]">
                              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Huéspedes</label>
                              <CustomSelect
                                value={String(line.numGuests)}
                                onChange={(v) =>
                                  setRoomLines((prev) =>
                                    prev.map((l, i) =>
                                      i === index ? { ...l, numGuests: parseInt(v, 10) || 1 } : l
                                    )
                                  )
                                }
                                options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
                                  value: String(n),
                                  label: n === 1 ? "1 persona" : `${n} personas`,
                                }))}
                                placeholder="—"
                                aria-label={`Nº huéspedes habitación ${index + 1}`}
                                className="min-w-full"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setRoomLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
                              }
                              disabled={!newCheckIn || !newCheckOut}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:border-[var(--destructive)] hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] disabled:pointer-events-none disabled:opacity-50"
                              title="Quitar habitación"
                              aria-label="Quitar habitación"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setRoomLines((prev) => [...prev, { roomId: "", numGuests: 1 }])}
                          disabled={!newCheckIn || !newCheckOut}
                          className="rounded-lg border border-dashed border-[var(--border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--muted)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-50"
                        >
                          + Agregar otra habitación
                        </button>
                        {newCheckIn && newCheckOut && (
                          <p className="mt-1.5 text-xs text-[var(--muted)]">
                            {availableRooms.length === 0
                              ? "No hay habitaciones disponibles para estas fechas."
                              : `${availableRooms.length} disponible${availableRooms.length !== 1 ? "s" : ""} para las fechas elegidas.`}
                          </p>
                        )}
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
                          onChange={(e) => {
                            if (newDownPaymentMethod === "PURCHASE_ORDER") return;
                            setNewDownPayment(Math.max(0, parseInt(e.target.value.replace(/\D/g, ""), 10) || 0));
                          }}
                          placeholder={newDownPaymentMethod === "PURCHASE_ORDER" ? "No aplica (orden de compra)" : "Monto que abona el cliente ahora"}
                          disabled={newDownPaymentMethod === "PURCHASE_ORDER"}
                          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${newDownPaymentMethod === "PURCHASE_ORDER" ? "cursor-not-allowed bg-[var(--muted)]/20 border-[var(--border)]" : newTotalAmount > 0 && newDownPayment > newTotalAmount ? "border-[var(--destructive)] bg-[var(--destructive)]/5 focus:ring-[var(--destructive)]" : "border-[var(--border)] bg-[var(--background)] focus:ring-[var(--primary)]"}`}
                        />
                        {newTotalAmount > 0 && (
                          <p className="mt-0.5 text-xs text-[var(--muted)]">Máximo: ${newTotalAmount.toLocaleString("es-CL")}</p>
                        )}
                        {newTotalAmount > 0 && newDownPayment > newTotalAmount && (
                          <p className="mt-1.5 text-sm font-medium text-[var(--destructive)]" role="alert">
                            El abonado excede el total. Corrija el monto para poder crear la reserva.
                          </p>
                        )}
                        <div className="mt-2">
                          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Método de pago</label>
                          <CustomSelect
                            value={newDownPaymentMethod}
                            onChange={(v) => {
                              const method = v as typeof newDownPaymentMethod;
                              setNewDownPaymentMethod(method);
                              if (method === "PURCHASE_ORDER") setNewDownPayment(0);
                              else setNewPaymentTermDays(0);
                            }}
                            options={[
                              { value: "CASH", label: "Efectivo" },
                              { value: "TRANSFER", label: "Transferencia" },
                              { value: "DEBIT", label: "Débito" },
                              { value: "CREDIT", label: "Crédito" },
                              ...(localGuests.find((g) => g.id === newGuestId)?.type === "COMPANY"
                                ? [{ value: "PURCHASE_ORDER", label: "Orden de compra" }]
                                : []),
                              { value: "OTHER", label: "Otro" },
                            ]}
                            placeholder="Seleccionar método"
                            aria-label="Método de pago"
                          />
                          <input type="hidden" name="downPaymentMethod" value={newDownPaymentMethod === "PURCHASE_ORDER" ? "OTHER" : newDownPaymentMethod} />
                        </div>
                        {newDownPaymentMethod === "PURCHASE_ORDER" && (
                          <div className="mt-3 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-3">
                            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Días hábiles para pagar</label>
                            <input
                              type="number"
                              min={1}
                              max={365}
                              value={newPaymentTermDays || ""}
                              onChange={(e) => setNewPaymentTermDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              placeholder="Ej. 30"
                              className="w-full max-w-[8rem] rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            />
                            <p className="mt-1 text-xs text-[var(--muted)]">Plazo en días hábiles después del check-out. Aparecerá en Pagos pendientes (Empresas con orden de compra).</p>
                          </div>
                        )}
                        {newTotalAmount > 0 && newDownPaymentMethod !== "PURCHASE_ORDER" && (
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
                        <CrearReservaSubmitButton
                          disabled={
                            !newFolioNumber?.trim() ||
                            !newProcessedByName?.trim() ||
                            roomLines.every((l) => !l.roomId) ||
                            (newTotalAmount > 0 && newDownPayment > newTotalAmount) ||
                            (newDownPaymentMethod === "PURCHASE_ORDER" && (!newPaymentTermDays || newPaymentTermDays < 1))
                          }
                          loading={bulkSaving}
                        />
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
                    className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
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
                      <input type="hidden" name="guestType" value={newGuestType} />
                      {guestState?.error && (
                        <p className="rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
                          {guestState.error}
                        </p>
                      )}
                      <div>
                        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">Categoría *</span>
                        <div className="flex gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-1">
                          <button
                            type="button"
                            onClick={() => setNewGuestType("PERSON")}
                            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${newGuestType === "PERSON" ? "bg-[var(--primary)] text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                          >
                            Persona
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewGuestType("COMPANY")}
                            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${newGuestType === "COMPANY" ? "bg-[var(--primary)] text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                          >
                            Empresa
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          En Pagos pendientes aparecerán en la sección correspondiente.
                        </p>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                          {newGuestType === "COMPANY" ? "Nombre del contacto *" : "Nombre completo *"}
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          required
                          placeholder={newGuestType === "COMPANY" ? "Ej. Juan Pérez (representante)" : "Ej. Juan Pérez"}
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      </div>
                      {newGuestType === "COMPANY" && (
                        <>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Razón social *</label>
                            <input
                              type="text"
                              name="companyName"
                              required={newGuestType === "COMPANY"}
                              placeholder="Ej. Hotelera Norte SpA"
                              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[var(--muted)]">RUT empresa (opcional)</label>
                            <input
                              type="text"
                              name="companyRut"
                              inputMode="numeric"
                              autoComplete="off"
                              value={newGuestCompanyRut}
                              onChange={(e) => setNewGuestCompanyRut(formatChileanRut(e.target.value))}
                              placeholder="76.123.456-7"
                              maxLength={12}
                              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            />
                            <p className="mt-0.5 text-xs text-[var(--muted)]">Máx. 8 dígitos + dígito verificador (0-9 o K)</p>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[var(--muted)]">Email empresa (opcional)</label>
                            <input
                              type="email"
                              name="companyEmail"
                              placeholder="facturacion@empresa.cl"
                              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            />
                          </div>
                        </>
                      )}
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

                    {/* Estados (debajo del mes, para entender los colores del calendario) */}
                    <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-xs">
                        <span className="font-medium text-[var(--muted)]">Estados:</span>
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded border border-emerald-200/60 bg-emerald-50 text-emerald-600 font-semibold">+</span>
                            <span className="text-[var(--muted)]">Disponible</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 min-w-[24px] items-center justify-center rounded bg-slate-200 text-slate-600 font-semibold">−</span>
                            <span className="text-[var(--muted)]">Ocupado</span>
                        </div>
                        <div className="h-4 w-px bg-[var(--border)]" />
                        <div className="flex flex-wrap items-center gap-3">
                            {(["pending", "confirmed", "checked_in", "checked_out", "cancelled", "no_show"] as const).map((status) => (
                                <div key={status} className="flex items-center gap-1.5">
                                    <span className={`inline-block h-4 w-4 rounded ${CALENDAR_STATUS_STYLES[status]} border border-[var(--border)]`} />
                                    <span className="text-[var(--muted)]">{statusLabels[status]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cuadrícula del calendario */}
                    <div className="w-full overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
                        <table className="w-full table-fixed border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                                    <th className="w-28 shrink-0 border-r border-[var(--border)] px-3 py-2.5 text-left text-xs font-medium text-[var(--muted)]">Habitación</th>
                                    {monthDays.map((d) => (
                                        <th key={d.toISOString()} className="min-w-0 px-0 py-2 text-center text-xs font-medium text-[var(--muted)]">
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
                                            const span = isDisplayStartOfReservation(roomNumber, day) ? getReservationSpan(roomNumber, day) : 0;

                                            if (span > 0 && res) {
                                                const statusStyle = CALENDAR_STATUS_STYLES[res.status];
                                                const paymentStatus = getPaymentStatus(res);
                                                const guestTypeLabel = res.guest_type === "COMPANY" ? "Empresa" : "Persona";
                                                return (
                                                    <td
                                                        key={day.toISOString()}
                                                        colSpan={span}
                                                        className="px-0.5 py-1 align-middle"
                                                    >
                                                        <div className="group relative min-h-[36px] w-full">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedReservation(res)}
                                                                className={`min-h-[36px] w-full flex items-center justify-center rounded-lg px-2 py-1.5 text-xs font-semibold text-white truncate transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer ${statusStyle}`}
                                                            >
                                                                {res.guest_name}
                                                            </button>
                                                            {/* Tooltip al pasar el mouse (se abre a la izquierda para no requerir scroll) */}
                                                            <div className="pointer-events-none absolute right-full top-1/2 z-20 mr-1 -translate-y-1/2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-left text-xs shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100" style={{ minWidth: "200px", maxWidth: "280px" }}>
                                                                <p className="font-semibold text-[var(--foreground)]">{res.guest_name}</p>
                                                                <p className={`mt-1 font-medium ${
                                                                    res.status === "cancelled" ? "text-[var(--destructive)]" :
                                                                    res.status === "no_show" ? "text-[var(--warning)]" :
                                                                    res.status === "pending" ? "text-[var(--warning)]" :
                                                                    res.status === "confirmed" ? "text-[var(--primary)]" :
                                                                    res.status === "checked_in" ? "text-[var(--success)]" :
                                                                    "text-[var(--muted)]"
                                                                }`}>
                                                                    {res.status === "cancelled" ? "Reserva cancelada" : statusLabels[res.status]}
                                                                </p>
                                                                <p className="mt-0.5 text-[var(--muted)]">{formatDate(res.check_in)} – {formatDate(res.check_out)}</p>
                                                                <p className="text-[var(--muted)]">{res.nights} {res.nights === 1 ? "noche" : "noches"} · {formatCLP(res.total_price)}</p>
                                                                <p className="mt-1 flex flex-wrap gap-1">
                                                                    <span className="rounded px-1.5 py-0.5 bg-[var(--muted)]/20 text-[var(--muted)]">{guestTypeLabel}</span>
                                                                    {paymentStatus && <span className={`rounded px-1.5 py-0.5 ${paymentStatus.className}`}>{paymentStatus.label}</span>}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            if (res) return null; // celda ya cubierta por colspan

                                            return (
                                                <td key={day.toISOString()} className="w-[1%] px-0.5 py-1 align-middle">
                                                    <div
                                                        className="flex h-[36px] w-full min-w-[28px] items-center justify-center rounded-lg border border-emerald-200/60 bg-emerald-50 text-emerald-600 font-semibold shadow-sm hover:bg-emerald-100 hover:border-emerald-300/80 hover:shadow transition-all cursor-pointer"
                                                        title={`Disponible · Hab. ${roomNumber} - Click para reservar`}
                                                    >
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
                        { value: "checked_in", label: "Check-in realizado" },
                        { value: "checked_out", label: "Check-out realizado" },
                        { value: "no_show", label: "No se presentó" },
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
                        className="relative rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition-all hover:shadow-md sm:p-5 sm:pr-14"
                    >
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setReservationToDelete(reservation); }}
                            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] shrink-0 sm:top-4 sm:right-4"
                            aria-label="Eliminar reserva"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-[minmax(0,1fr)_auto_auto] min-[700px]:items-center">
                            {/* Bloque: icono + datos */}
                            <div className="flex min-w-0 gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                                    <Calendar className="h-5 w-5 text-[var(--primary)]" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-semibold text-[var(--foreground)]">{reservation.guest_name}</h3>
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${reservation.guest_type === "COMPANY" ? "bg-[var(--secondary)]/20 text-[var(--secondary)]" : "bg-[var(--muted)]/20 text-[var(--muted)]"}`}>
                                            {reservation.guest_type === "COMPANY" ? "Empresa" : "Persona"}
                                        </span>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${statusColors[reservation.status]}`}>
                                            {statusLabels[reservation.status]}
                                        </span>
                                        {(() => {
                                            const ps = getPaymentStatus(reservation);
                                            return ps ? (
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium shadow-sm border ${ps.className}`}>
                                                    {ps.label}
                                                </span>
                                            ) : null;
                                        })()}
                                    </div>
                                    <p className="mt-1.5 text-sm text-[var(--muted)]">
                                        {formatDate(reservation.check_in)} – {formatDate(reservation.check_out)}
                                        <span className="mx-1.5">·</span>
                                        Hab. {reservation.room_number}
                                        <span className="mx-1.5">·</span>
                                        {reservation.guests} {reservation.guests === 1 ? "huésped" : "huéspedes"}
                                        <span className="mx-1.5">·</span>
                                        {reservation.nights} {reservation.nights === 1 ? "noche" : "noches"}
                                    </p>
                                    <p className="mt-0.5 text-xs text-[var(--muted)] truncate">
                                        {reservation.guest_email}
                                        {reservation.guest_phone ? ` · ${reservation.guest_phone}` : ""}
                                    </p>
                                    {(reservation.folio_number || reservation.processed_by_name) && (
                                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                                            {reservation.folio_number && <>Folio {reservation.folio_number}</>}
                                            {reservation.folio_number && reservation.processed_by_name && " · "}
                                            {reservation.processed_by_name && <>Gestionada por {reservation.processed_by_name}</>}
                                        </p>
                                    )}
                                    {reservation.payment_term_days != null && reservation.payment_term_days > 0 && (
                                        <p className="mt-1 text-xs font-medium text-[var(--primary)]">
                                            Orden de compra · {reservation.payment_term_days} días hábiles
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Precio */}
                            <div className="flex items-center justify-between min-[700px]:justify-self-end min-[700px]:block">
                                <span className="text-sm text-[var(--muted)] min-[700px]:hidden">Total</span>
                                <p className="text-lg font-bold text-[var(--foreground)]">{formatCLP(reservation.total_price)}</p>
                            </div>

                            {/* Acciones */}
                            <div className="grid grid-cols-2 gap-2 min-[700px]:flex min-[700px]:flex-wrap min-[700px]:justify-end min-[700px]:gap-2">
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
                                    {reservation.status === "confirmed" && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const ok = await updateReservationStatus(reservation.id, "CHECKED_IN");
                                                    if (ok?.success) router.refresh();
                                                    else if (ok?.error) alert(ok.error);
                                                }}
                                                className="flex items-center justify-center rounded-lg border border-[var(--success)]/50 bg-[var(--success)]/10 px-3 py-2 text-sm font-medium text-[var(--success)] transition-colors hover:bg-[var(--success)]/20"
                                            >
                                                Check-in realizado
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmModal({ type: "no_show", reservation })}
                                                className="flex items-center justify-center rounded-lg border border-[var(--warning)]/50 bg-[var(--warning)]/10 px-3 py-2 text-sm font-medium text-[var(--warning)] transition-colors hover:bg-[var(--warning)]/20"
                                            >
                                                No se presentó
                                            </button>
                                        </>
                                    )}
                                    {reservation.status === "checked_in" && (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const ok = await updateReservationStatus(reservation.id, "CHECKED_OUT");
                                                if (ok?.success) router.refresh();
                                                else if (ok?.error) alert(ok.error);
                                            }}
                                            className="flex items-center justify-center rounded-lg border border-[var(--muted)] bg-[var(--muted)]/10 px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--muted)]/20"
                                        >
                                            Check-out realizado
                                        </button>
                                    )}
                                    {reservation.status !== "cancelled" && reservation.status !== "no_show" && reservation.status !== "checked_out" && (
                                        <button
                                            type="button"
                                            onClick={() => setConfirmModal({ type: "cancel", reservation })}
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
                ))}
            </div>
                </>
            )}

            {/* Modal confirmar (no presentado / cancelar reserva) */}
            {confirmModal &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  className="fixed inset-0 z-[55] flex min-h-screen items-center justify-center bg-black/50 p-4"
                  onClick={() => setConfirmModal(null)}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="confirm-modal-title"
                >
                  <div
                    className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 id="confirm-modal-title" className="text-lg font-semibold text-[var(--foreground)]">
                      {confirmModal.type === "no_show" ? "No se presentó" : "Cancelar reserva"}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {confirmModal.type === "no_show"
                        ? "¿Marcar como no presentado? El huésped no asistió a la reserva."
                        : "¿Cancelar esta reserva? Esta acción no se puede deshacer."}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                      {confirmModal.reservation.guest_name}
                      {confirmModal.reservation.room_number ? ` · Hab. ${confirmModal.reservation.room_number}` : ""}
                    </p>
                    <div className="mt-6 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setConfirmModal(null)}
                        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/20"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const { type, reservation: res } = confirmModal;
                          setConfirmModal(null);
                          const ok = await updateReservationStatus(res.id, type === "no_show" ? "NO_SHOW" : "CANCELLED");
                          if (ok?.success) {
                            if (type === "cancel") setSelectedReservation(null);
                            router.refresh();
                          } else if (ok?.error) alert(ok.error);
                        }}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 ${
                          confirmModal.type === "no_show"
                            ? "bg-[var(--warning)]"
                            : "bg-[var(--destructive)]"
                        }`}
                      >
                        Aceptar
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
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
            {selectedReservation ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => { setSelectedReservation(null); setEntryCardPreviewUrl(null); }}
                >
                    <div
                        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--card)] px-6 pt-6 pb-5">
                            <div className="min-w-0">
                                <h3 className="text-xl font-semibold text-[var(--foreground)] truncate">
                                    {selectedReservation.guest_name}
                                </h3>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[selectedReservation.status]}`}>
                                        {statusLabels[selectedReservation.status]}
                                    </span>
                                    {(() => {
                                        const ps = getPaymentStatus(selectedReservation);
                                        return ps ? (
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium border ${ps.className}`}>
                                                {ps.label}
                                            </span>
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setSelectedReservation(null); setEntryCardPreviewUrl(null); }}
                                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors shrink-0"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Contenido con secciones claras */}
                        <div className="px-6 py-6 space-y-8">
                            {/* Detalles de la reserva */}
                            <section>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
                                    Detalles de la reserva
                                </h4>
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 overflow-hidden">
                                    <div className="flex items-center gap-4 px-4 py-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                                            <Calendar className="h-5 w-5 text-[var(--primary)]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-[var(--foreground)]">
                                                {formatDate(selectedReservation.check_in)} — {formatDate(selectedReservation.check_out)}
                                            </p>
                                            <p className="text-xs text-[var(--muted)]">
                                                {selectedReservation.nights} {selectedReservation.nights === 1 ? "noche" : "noches"}
                                                <span className="mx-1.5">·</span>
                                                Hab. {selectedReservation.room_number} ({selectedReservation.room_type})
                                                <span className="mx-1.5">·</span>
                                                {selectedReservation.guests} {selectedReservation.guests === 1 ? "huésped" : "huéspedes"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Contacto */}
                            <section>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
                                    Contacto
                                </h4>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
                                    <a
                                        href={`mailto:${selectedReservation.guest_email}`}
                                        className="flex items-center gap-2 text-[var(--primary)] hover:underline"
                                    >
                                        <Mail className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                                        <span className="truncate">{selectedReservation.guest_email}</span>
                                    </a>
                                    {selectedReservation.guest_phone && (
                                        <a
                                            href={`tel:${selectedReservation.guest_phone}`}
                                            className="flex items-center gap-2 text-[var(--foreground)] hover:text-[var(--primary)]"
                                        >
                                            <Phone className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                                            <span>{selectedReservation.guest_phone}</span>
                                        </a>
                                    )}
                                </div>
                            </section>

                            {/* Pago */}
                            <section>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
                                    Pago
                                </h4>
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-5">
                                    {(selectedReservation.pending_amount != null && selectedReservation.pending_amount === 0) ||
                                     (selectedReservation.paid_amount != null && selectedReservation.paid_amount >= selectedReservation.total_price) ? (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-[var(--success)]">Pago completado</span>
                                            <p className="text-xl font-bold text-[var(--foreground)]">{formatCLP(selectedReservation.total_price)}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {selectedReservation.paid_amount != null && selectedReservation.paid_amount > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[var(--muted)]">Abonado</span>
                                                    <span className="font-medium">{formatCLP(selectedReservation.paid_amount)}</span>
                                                </div>
                                            )}
                                            {selectedReservation.pending_amount != null && selectedReservation.pending_amount > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[var(--muted)]">Saldo pendiente</span>
                                                    <span className="font-medium text-[var(--warning)]">{formatCLP(selectedReservation.pending_amount)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between pt-3 border-t border-[var(--border)]">
                                                <span className="text-sm text-[var(--muted)]">Total</span>
                                                <p className="text-lg font-bold text-[var(--foreground)]">{formatCLP(selectedReservation.total_price)}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Folio, recepcionista y foto tarjeta de ingreso */}
                            <section>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
                                    Tarjeta de ingreso
                                </h4>
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-4 space-y-3">
                                    {selectedReservation.folio_number && (
                                        <p className="text-sm">
                                            <span className="text-[var(--muted)]">Folio:</span>{" "}
                                            <span className="font-medium text-[var(--foreground)]">{selectedReservation.folio_number}</span>
                                        </p>
                                    )}
                                    {selectedReservation.processed_by_name && (
                                        <p className="text-sm">
                                            <span className="text-[var(--muted)]">Gestionada por:</span>{" "}
                                            <span className="font-medium text-[var(--foreground)]">{selectedReservation.processed_by_name}</span>
                                        </p>
                                    )}
                                    {(() => {
                                        const photoUrl = selectedReservation.entry_card_image_url || entryCardUrlOverride[selectedReservation.id];
                                        return (
                                            <div>
                                                <span className="text-[var(--muted)] text-sm block mb-2">Foto de la tarjeta firmada</span>
                                                {photoUrl ? (
                                                    <div className="space-y-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEntryCardPreviewUrl(photoUrl)}
                                                            className="block rounded-lg overflow-hidden border border-[var(--border)] max-w-[280px] text-left hover:ring-2 hover:ring-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                                        >
                                                            <img src={photoUrl} alt="Tarjeta de ingreso" className="w-full h-auto object-contain max-h-48" />
                                                        </button>
                                                        <p className="text-xs text-[var(--muted)]">Clic en la imagen para ver en grande. Respaldo de la tarjeta de ingreso con firma del huésped.</p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            id="entry-card-file"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file || !selectedReservation) return;
                                                                e.target.value = "";
                                                                setUploadingEntryCard(true);
                                                                try {
                                                                    const fd = new FormData();
                                                                    fd.append("photo", file);
                                                                    const res = await fetch("/api/upload/entry-card", { method: "POST", body: fd });
                                                                    const data = await res.json();
                                                                    if (!res.ok || !data.url) {
                                                                        alert(data.error || "Error al subir la imagen");
                                                                        return;
                                                                    }
                                                                    const result = await updateReservationEntryCard(selectedReservation.id, data.url);
                                                                    if (result?.success) {
                                                                        setEntryCardUrlOverride((prev) => ({ ...prev, [selectedReservation.id]: data.url }));
                                                                        router.refresh();
                                                                    } else if (result?.error) alert(result.error);
                                                                } catch (err) {
                                                                    alert(err instanceof Error ? err.message : "Error al subir");
                                                                } finally {
                                                                    setUploadingEntryCard(false);
                                                                }
                                                            }}
                                                        />
                                                        <label
                                                            htmlFor="entry-card-file"
                                                            className={`inline-flex items-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)]/60 px-4 py-3 text-sm font-medium text-[var(--muted)] hover:bg-[var(--muted)]/10 hover:text-[var(--foreground)] cursor-pointer transition-colors ${uploadingEntryCard ? "opacity-60 pointer-events-none" : ""}`}
                                                        >
                                                            <ImagePlus className="h-4 w-4" />
                                                            {uploadingEntryCard ? "Subiendo…" : "Adjuntar foto de la tarjeta de ingreso"}
                                                        </label>
                                                        <p className="mt-1.5 text-xs text-[var(--muted)]">Se rellena en papel al ingreso del huésped; adjunte la foto como respaldo (con firma).</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </section>

                            {selectedReservation.special_requests && (
                                <section>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
                                        Solicitudes especiales
                                    </h4>
                                    <p className="text-sm text-[var(--foreground)] rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-4">
                                        {selectedReservation.special_requests}
                                    </p>
                                </section>
                            )}
                        </div>

                        {/* Solo Cerrar: las acciones se gestionan desde la lista */}
                        <div className="sticky bottom-0 border-t border-[var(--border)] bg-[var(--card)] px-6 py-4">
                            <button
                                type="button"
                                onClick={() => { setSelectedReservation(null); setEntryCardPreviewUrl(null); }}
                                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Modal ver foto tarjeta de ingreso en grande */}
            {entryCardPreviewUrl && typeof document !== "undefined" &&
              createPortal(
                <div
                  className="fixed inset-0 z-[60] flex min-h-screen items-center justify-center bg-black/80 p-4"
                  onClick={() => setEntryCardPreviewUrl(null)}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Foto de la tarjeta de ingreso"
                >
                  <button
                    type="button"
                    onClick={() => setEntryCardPreviewUrl(null)}
                    className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[var(--foreground)] shadow-lg hover:bg-white"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <img
                    src={entryCardPreviewUrl}
                    alt="Tarjeta de ingreso"
                    className="max-h-[90vh] max-w-full object-contain rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>,
                document.body
              )}
        </div>
    );
}
