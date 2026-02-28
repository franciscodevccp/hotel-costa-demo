"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { createPortal } from "react-dom";
import { Search, Users, Lock, X, Calendar, Plus, Trash2 } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { updateGuest, getGuestReservationsAction, setGuestBlocked, setGuestUnblocked, deleteGuest, type UpdateGuestState, type GuestReservationItem } from "@/app/dashboard/guests/actions";

type GuestRow = Awaited<ReturnType<typeof import("@/lib/queries/guests").getGuests>>[number];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CHECKED_IN: "Check-in",
  CHECKED_OUT: "Check-out",
  CANCELLED: "Cancelada",
  NO_SHOW: "No show",
};

function toStatus(g: GuestRow): "active" | "checked_out" | "blacklisted" {
  if (g.isBlacklisted) return "blacklisted";
  return "active";
}

const statusColors: Record<string, string> = {
  active: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
  checked_out: "bg-[var(--muted)]/10 text-[var(--muted)] border-[var(--muted)]/20",
  blacklisted: "bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]/20",
};

const statusLabels: Record<string, string> = {
  active: "Activo",
  checked_out: "Check-out",
  blacklisted: "Bloqueado",
};

export function AdminGuestsView({ guests }: { guests: GuestRow[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [guestToEdit, setGuestToEdit] = useState<GuestRow | null>(null);
  const [guestHistory, setGuestHistory] = useState<GuestRow | null>(null);
  const [historyReservations, setHistoryReservations] = useState<GuestReservationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showEditEmergencyContact, setShowEditEmergencyContact] = useState(false);
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockReasonInput, setBlockReasonInput] = useState("");
  const [blockError, setBlockError] = useState<string | null>(null);
  const [guestToDelete, setGuestToDelete] = useState<GuestRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updateState, updateFormAction] = useActionState(updateGuest, {} as UpdateGuestState);

  useEffect(() => {
    if (blockModalOpen && guestToEdit) {
      setBlockReasonInput(guestToEdit.blockReason ?? "");
      setBlockError(null);
    }
  }, [blockModalOpen, guestToEdit]);

  useEffect(() => {
    if (guestToEdit?.emergencyContact) {
      const parts = guestToEdit.emergencyContact.split(" · ");
      setEditEmergencyName(parts[0]?.trim() ?? "");
      setEditEmergencyPhone(parts[1]?.trim() ?? "");
      setShowEditEmergencyContact(true);
    } else {
      setShowEditEmergencyContact(false);
      setEditEmergencyName("");
      setEditEmergencyPhone("");
    }
  }, [guestToEdit]);

  useEffect(() => {
    if (guestHistory) {
      setLoadingHistory(true);
      getGuestReservationsAction(guestHistory.id).then((result) => {
        setLoadingHistory(false);
        if (Array.isArray(result)) setHistoryReservations(result);
        else setHistoryReservations([]);
      });
    } else {
      setHistoryReservations([]);
    }
  }, [guestHistory]);

  useEffect(() => {
    if (updateState?.success) {
      setGuestToEdit(null);
      router.refresh();
    }
  }, [updateState?.success, router]);

  const filtered = guests.filter((g) => {
    const status = toStatus(g);
    const matchStatus = !statusFilter || status === statusFilter;
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      g.fullName.toLowerCase().includes(term) ||
      (g.email?.toLowerCase().includes(term)) ||
      (g.rut?.includes(term));
    return matchStatus && matchSearch;
  });

  const formatCLP = (amount: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(amount);
  const activeCount = guests.filter((g) => toStatus(g) === "active").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Gestión de Huéspedes</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Administra la información de todos los huéspedes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[var(--success)]/20 bg-gradient-to-br from-[var(--success)]/5 to-[var(--success)]/10 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[var(--success)]/20 p-2.5">
              <Users className="h-5 w-5 text-[var(--success)]" />
            </div>
            <p className="text-sm font-medium text-[var(--muted)]">Huéspedes Activos</p>
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight text-[var(--success)]">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--primary)]/10 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[var(--primary)]/20 p-2.5">
              <Users className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <p className="text-sm font-medium text-[var(--muted)]">Total Huéspedes</p>
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight text-[var(--primary)]">{guests.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--destructive)]/20 bg-gradient-to-br from-[var(--destructive)]/5 to-[var(--destructive)]/10 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[var(--destructive)]/20 p-2.5">
              <Lock className="h-5 w-5 text-[var(--destructive)]" />
            </div>
            <p className="text-sm font-medium text-[var(--muted)]">Bloqueados</p>
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight text-[var(--destructive)]">
            {guests.filter((g) => g.isBlacklisted).length}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o RUT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2.5 pl-10 pr-4 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:shadow-md"
          />
        </div>
        <CustomSelect
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Todos los estados"
          options={[
            { value: "active", label: "Activos" },
            { value: "checked_out", label: "Check-out" },
            { value: "blacklisted", label: "Bloqueados" },
          ]}
          className="min-w-[160px]"
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-[var(--muted)]">
            No hay huéspedes que coincidan con los filtros.
          </p>
        ) : (
          filtered.map((guest) => {
            const status = toStatus(guest);
            return (
              <div
                key={guest.id}
                className="relative rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition-all hover:shadow-md min-[700px]:p-4"
              >
                <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-[1fr_auto] min-[700px]:gap-6 min-[700px]:items-center">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                      <Users className="h-5 w-5 text-[var(--primary)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[var(--foreground)] truncate">{guest.fullName}</h3>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${guest.type === "COMPANY" ? "bg-[var(--secondary)]/20 text-[var(--secondary)]" : "bg-[var(--muted)]/20 text-[var(--muted)]"}`}>
                          {guest.type === "COMPANY" ? "Empresa" : "Persona"}
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[status]}`}>
                          {statusLabels[status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)] truncate">
                        {guest.email ?? "—"} · {guest.phone ?? "—"}
                      </p>
                      <p className="mt-0.5 text-sm text-[var(--muted)]">
                        RUT {guest.rut ?? "—"}
                      </p>
                      {guest.emergencyContact && (
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Emergencia: {guest.emergencyContact}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 min-[700px]:justify-end">
                    <button
                      type="button"
                      onClick={() => setGuestToEdit(guest)}
                      className="flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuestHistory(guest)}
                      className="flex items-center justify-center rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[var(--primary)]/90"
                    >
                      Ver historial
                    </button>
                    <button
                      type="button"
                      onClick={() => { setGuestToDelete(guest); setDeleteError(null); }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--destructive)] hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]"
                      title="Eliminar huésped"
                      aria-label="Eliminar huésped"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Editar huésped */}
      {guestToEdit &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/50 p-4"
            onClick={() => setGuestToEdit(null)}
          >
            <div
              className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Editar huésped</h3>
                <button
                  type="button"
                  onClick={() => setGuestToEdit(null)}
                  className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--muted)]/20 hover:text-[var(--foreground)]"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form action={updateFormAction} className="space-y-4">
                <input type="hidden" name="guestId" value={guestToEdit.id} />
                {updateState?.error && (
                  <p className="rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
                    {updateState.error}
                  </p>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Nombre completo *</label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    defaultValue={guestToEdit.fullName}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">RUT *</label>
                  <input
                    type="text"
                    name="rut"
                    required
                    defaultValue={guestToEdit.rut ?? ""}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    defaultValue={guestToEdit.email ?? ""}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Teléfono *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    defaultValue={guestToEdit.phone ?? ""}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  {!showEditEmergencyContact ? (
                    <button
                      type="button"
                      onClick={() => setShowEditEmergencyContact(true)}
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
                          onClick={() => setShowEditEmergencyContact(false)}
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
                          value={editEmergencyName}
                          onChange={(e) => setEditEmergencyName(e.target.value)}
                          placeholder="Ej. María Pérez"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Teléfono</label>
                        <input
                          type="tel"
                          name="emergencyContactPhone"
                          value={editEmergencyPhone}
                          onChange={(e) => setEditEmergencyPhone(e.target.value)}
                          placeholder="+569 1234 5678"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Notas</label>
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={guestToEdit.notes ?? ""}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  {guestToEdit.isBlacklisted ? (
                    <button
                      type="button"
                      onClick={() => setBlockModalOpen(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-2.5 text-sm font-medium text-[var(--destructive)] hover:bg-[var(--destructive)]/20"
                    >
                      <Lock className="h-4 w-4" />
                      Bloqueado — Ver motivo
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setBlockReasonInput(""); setBlockError(null); setBlockModalOpen(true); }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--destructive)]/10 hover:border-[var(--destructive)]/30 hover:text-[var(--destructive)]"
                    >
                      <Lock className="h-4 w-4" />
                      Bloquear huésped
                    </button>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setGuestToEdit(null)}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/20"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
                  >
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal confirmar eliminar huésped */}
      {guestToDelete &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/50 p-4"
            onClick={() => { if (!isDeleting) { setGuestToDelete(null); setDeleteError(null); } }}
          >
            <div
              className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-[var(--destructive)]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--destructive)]/10">
                  <Trash2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Eliminar huésped</h3>
              </div>
              <p className="mt-4 text-sm text-[var(--muted)]">
                ¿Estás seguro de que deseas eliminar a <strong className="text-[var(--foreground)]">{guestToDelete.fullName}</strong>? Esta acción no se puede deshacer.
              </p>
              {deleteError && (
                <p className="mt-3 rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
                  {deleteError}
                </p>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => { setGuestToDelete(null); setDeleteError(null); }}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/10 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    if (!guestToDelete) return;
                    setIsDeleting(true);
                    setDeleteError(null);
                    const result = await deleteGuest(guestToDelete.id);
                    if (result?.error) {
                      setDeleteError(result.error);
                      setIsDeleting(false);
                    } else {
                      setGuestToDelete(null);
                      setDeleteError(null);
                      setIsDeleting(false);
                      router.refresh();
                    }
                  }}
                  className="flex-1 rounded-lg bg-[var(--destructive)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--destructive)]/90 disabled:opacity-50"
                >
                  {isDeleting ? "Eliminando…" : "Eliminar"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal motivo de bloqueo / Bloquear huésped */}
      {blockModalOpen && guestToEdit &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex min-h-screen items-center justify-center bg-black/50 p-4"
            onClick={() => setBlockModalOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  {guestToEdit.isBlacklisted ? "Motivo del bloqueo" : "Bloquear huésped"}
                </h3>
                <button
                  type="button"
                  onClick={() => setBlockModalOpen(false)}
                  className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--muted)]/20 hover:text-[var(--foreground)]"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {guestToEdit.isBlacklisted ? (
                <>
                  <p className="mb-2 text-sm font-medium text-[var(--muted)]">Motivo registrado:</p>
                  <p className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--muted)]/5 px-3 py-2.5 text-sm text-[var(--foreground)]">
                    {guestToEdit.blockReason ?? "—"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBlockModalOpen(false)}
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/20"
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await setGuestUnblocked(guestToEdit.id);
                        if (ok?.success) {
                          setGuestToEdit((prev) => (prev ? { ...prev, isBlacklisted: false, blockReason: null } : null));
                          setBlockModalOpen(false);
                          router.refresh();
                        } else if (ok?.error) setBlockError(ok.error);
                      }}
                      className="flex-1 rounded-lg bg-[var(--success)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
                    >
                      Desbloquear
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">¿Por qué se bloquea a este huésped? *</label>
                  <textarea
                    value={blockReasonInput}
                    onChange={(e) => setBlockReasonInput(e.target.value)}
                    rows={3}
                    placeholder="Ej. Impago reiterado, conducta inapropiada..."
                    className="mb-4 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  {blockError && (
                    <p className="mb-3 rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">{blockError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBlockModalOpen(false)}
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/20"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await setGuestBlocked(guestToEdit.id, blockReasonInput);
                        if (ok?.success) {
                          setGuestToEdit((prev) => (prev ? { ...prev, isBlacklisted: true, blockReason: blockReasonInput } : null));
                          setBlockModalOpen(false);
                          router.refresh();
                        } else if (ok?.error) setBlockError(ok.error);
                      }}
                      disabled={!blockReasonInput.trim()}
                      className="flex-1 rounded-lg bg-[var(--destructive)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Bloquear
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Modal Ver historial */}
      {guestHistory &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/50 p-4"
            onClick={() => setGuestHistory(null)}
          >
            <div
              className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Historial de reservas — {guestHistory.fullName}</h3>
                <button
                  type="button"
                  onClick={() => setGuestHistory(null)}
                  className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--muted)]/20 hover:text-[var(--foreground)]"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {guestHistory.emergencyContact && (
                <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/5 px-3 py-2 text-sm">
                  <span className="font-medium text-[var(--muted)]">Contacto de emergencia: </span>
                  <span className="text-[var(--foreground)]">{guestHistory.emergencyContact}</span>
                </div>
              )}
              <div className="flex-1 overflow-y-auto min-h-0">
                {loadingHistory ? (
                  <p className="py-8 text-center text-sm text-[var(--muted)]">Cargando historial...</p>
                ) : historyReservations.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[var(--muted)]">No hay reservas registradas.</p>
                ) : (
                  <ul className="space-y-2">
                    {historyReservations.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)]/50 px-4 py-3 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-[var(--muted)]" />
                          <span className="text-[var(--foreground)]">
                            {new Date(r.checkIn).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                            {" — "}
                            {new Date(r.checkOut).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Hab. {r.roomNumber}</span>
                          <span className="rounded-full bg-[var(--muted)]/20 px-2 py-0.5 text-xs text-[var(--muted)]">
                            {STATUS_LABELS[r.status] ?? r.status}
                          </span>
                        </div>
                        <div className="w-full text-[var(--muted)] sm:w-auto">
                          {r.nights} {r.nights === 1 ? "noche" : "noches"} · {formatCLP(r.totalAmount)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setGuestHistory(null)}
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/20"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
