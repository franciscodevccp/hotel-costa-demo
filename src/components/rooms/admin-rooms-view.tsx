"use client";

import { useState, useEffect, useActionState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, BedDouble, Plus, Search, X } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { createRoom, type CreateRoomState, updateRoom, type UpdateRoomState, deleteRoom } from "@/app/dashboard/rooms/actions";

const ROOM_TYPE_LABELS: Record<string, string> = {
  SINGLE: "Single",
  DOUBLE: "Doble",
  TRIPLE: "Triple",
  QUADRUPLE: "Cuádruple",
  PROMOTIONAL: "Promocional",
};

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-[var(--success)]/10 text-[var(--success)]",
  OCCUPIED: "bg-[var(--primary)]/10 text-[var(--primary)]",
  CLEANING: "bg-[var(--warning)]/10 text-[var(--warning)]",
  MAINTENANCE: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
};

const statusLabels: Record<string, string> = {
  AVAILABLE: "Disponible",
  OCCUPIED: "Ocupada",
  CLEANING: "Limpieza",
  MAINTENANCE: "Mantenimiento",
};

const ROOM_TYPE_OPTIONS = [
  { value: "SINGLE", label: "Single" },
  { value: "DOUBLE", label: "Doble" },
  { value: "TRIPLE", label: "Triple" },
  { value: "QUADRUPLE", label: "Cuádruple" },
  { value: "PROMOTIONAL", label: "Promocional" },
];

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Disponible" },
  { value: "OCCUPIED", label: "Ocupada" },
  { value: "CLEANING", label: "Limpieza" },
  { value: "MAINTENANCE", label: "Mantenimiento" },
];

const formatThousands = (n: number) =>
  n === 0 ? "" : n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const parsePrice = (s: string) => {
  const digits = s.replace(/\D/g, "");
  return digits === "" ? 0 : parseInt(digits, 10);
};

type Room = Awaited<ReturnType<typeof import("@/lib/queries/rooms").getRooms>>[number];

const initialState: CreateRoomState = {};
const initialEditState: UpdateRoomState = {};

export function AdminRoomsView({ rooms }: { rooms: Room[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [createRoomNumber, setCreateRoomNumber] = useState("");
  const [createType, setCreateType] = useState("");
  const [createPrice, setCreatePrice] = useState(0);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editType, setEditType] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPrice, setEditPrice] = useState(0);
  const [state, formAction] = useActionState(createRoom, initialState);
  const [editState, editFormAction] = useActionState(updateRoom, initialEditState);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [duplicatePending, setDuplicatePending] = useState<{ existingRoomId: string; roomNumber: string } | null>(null);
  const [replaceRoomId, setReplaceRoomId] = useState("");
  const createFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      setModalOpen(false);
      setDuplicatePending(null);
      setReplaceRoomId("");
      router.refresh();
    }
  }, [state?.success, router]);

  useEffect(() => {
    if (state?.duplicate && state?.existingRoomId && state?.roomNumber) {
      setDuplicatePending({
        existingRoomId: state.existingRoomId,
        roomNumber: state.roomNumber,
      });
    }
  }, [state?.duplicate, state?.existingRoomId, state?.roomNumber]);

  useEffect(() => {
    if (editState?.success) {
      setEditingRoom(null);
      router.refresh();
    }
  }, [editState?.success, router]);

  useEffect(() => {
    if (editingRoom) {
      setEditType(editingRoom.type);
      setEditStatus(editingRoom.status);
      setEditPrice(editingRoom.pricePerNight);
    }
  }, [editingRoom]);

  useEffect(() => {
    if (modalOpen) {
      setCreateRoomNumber("");
      setCreateType("");
      setCreatePrice(0);
      setDuplicatePending(null);
      setReplaceRoomId("");
    }
  }, [modalOpen]);

  const handleConfirmDelete = async () => {
    if (!roomToDelete) return;
    setDeleteError(null);
    setDeletingId(roomToDelete.id);
    const result = await deleteRoom(roomToDelete.id);
    setDeletingId(null);
    if (result?.error) {
      setDeleteError(result.error);
      return;
    }
    setRoomToDelete(null);
    router.refresh();
  };

  const filtered = rooms.filter((room) => {
    const matchStatus = !statusFilter || room.status === statusFilter;
    const matchSearch = !search || room.roomNumber.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const formatCLP = (amount: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Gestión de Habitaciones</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Administra todas las habitaciones del establecimiento</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 md:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nueva Habitación
        </button>
      </div>

      {/* Modal Nueva Habitación (portal para que el overlay cubra toda la pantalla) */}
      {modalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 min-h-screen flex items-center justify-center overflow-y-auto bg-black/50 p-4 py-8"
            style={{ minHeight: "100dvh" }}
            onClick={() => setModalOpen(false)}
          >
            <div
              className="my-auto w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Nueva habitación</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--muted)]/20 hover:text-[var(--foreground)]"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form ref={createFormRef} action={formAction} className="space-y-4">
              {replaceRoomId ? <input type="hidden" name="replaceRoomId" value={replaceRoomId} /> : null}
              {state?.error && (
                <p className="rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
                  {state.error}
                </p>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Número de habitación</label>
                <input
                  type="text"
                  name="roomNumber"
                  value={createRoomNumber}
                  onChange={(e) => setCreateRoomNumber(e.target.value)}
                  required
                  placeholder="Ej. 301"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Tipo</label>
                <input type="hidden" name="type" value={createType} />
                <CustomSelect
                  value={createType}
                  onChange={setCreateType}
                  options={ROOM_TYPE_OPTIONS}
                  placeholder="Seleccionar tipo"
                  className="w-full"
                  aria-label="Tipo de habitación"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Piso</label>
                  <input
                    type="number"
                    name="floor"
                    min={1}
                    defaultValue={1}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Precio/noche (CLP)</label>
                  <input type="hidden" name="pricePerNight" value={createPrice} />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatThousands(createPrice)}
                    onChange={(e) => setCreatePrice(parsePrice(e.target.value))}
                    placeholder="40.000"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Huéspedes máximos</label>
                <input
                  type="number"
                  name="maxGuests"
                  min={1}
                  defaultValue={2}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="hasPrivateBath"
                  id="hasPrivateBath"
                  value="true"
                  defaultChecked
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <label htmlFor="hasPrivateBath" className="text-sm text-[var(--foreground)]">
                  Baño privado
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Crear habitación
                </button>
              </div>
            </form>
            </div>
          </div>,
          document.body
        )
      }

      {/* Modal habitación ya registrada — ¿reemplazar? */}
      {duplicatePending &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] min-h-screen flex items-center justify-center overflow-y-auto bg-black/50 p-4 py-8"
            style={{ minHeight: "100dvh" }}
            onClick={() => setDuplicatePending(null)}
          >
            <div
              className="my-auto w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Habitación ya registrada</h3>
                <button
                  type="button"
                  onClick={() => setDuplicatePending(null)}
                  className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--muted)]/20 hover:text-[var(--foreground)]"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex gap-3 rounded-lg bg-[var(--warning)]/10 p-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--warning)]" />
                <p className="text-sm text-[var(--foreground)]">
                  La habitación <strong>Hab. {duplicatePending.roomNumber}</strong> ya está registrada. ¿Desea reemplazar los datos con los que acaba de ingresar?
                </p>
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDuplicatePending(null)}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/20"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReplaceRoomId(duplicatePending.existingRoomId);
                    setDuplicatePending(null);
                    setTimeout(() => createFormRef.current?.requestSubmit(), 100);
                  }}
                  className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Reemplazar datos
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* Modal Editar Habitación */}
      {editingRoom &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 min-h-screen flex items-center justify-center overflow-y-auto bg-black/50 p-4 py-8"
            style={{ minHeight: "100dvh" }}
            onClick={() => setEditingRoom(null)}
          >
            <div
              className="my-auto w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Editar habitación</h3>
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--muted)]/20 hover:text-[var(--foreground)]"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form action={editFormAction} className="space-y-4">
                <input type="hidden" name="roomId" value={editingRoom.id} />
                {editState?.error && (
                  <p className="rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
                    {editState.error}
                  </p>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Número de habitación</label>
                  <input
                    type="text"
                    name="roomNumber"
                    required
                    defaultValue={editingRoom.roomNumber}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Tipo</label>
                  <input type="hidden" name="type" value={editType} />
                  <CustomSelect
                    value={editType}
                    onChange={setEditType}
                    options={ROOM_TYPE_OPTIONS}
                    placeholder="Seleccionar tipo"
                    className="w-full"
                    aria-label="Tipo de habitación"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Estado</label>
                  <input type="hidden" name="status" value={editStatus} />
                  <CustomSelect
                    value={editStatus}
                    onChange={setEditStatus}
                    options={STATUS_OPTIONS}
                    placeholder="Seleccionar estado"
                    className="w-full"
                    aria-label="Estado de la habitación"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Piso</label>
                    <input
                      type="number"
                      name="floor"
                      min={1}
                      defaultValue={editingRoom.floor}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Precio/noche (CLP)</label>
                    <input type="hidden" name="pricePerNight" value={editPrice} />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatThousands(editPrice)}
                      onChange={(e) => setEditPrice(parsePrice(e.target.value))}
                      placeholder="40.000"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Huéspedes máximos</label>
                  <input
                    type="number"
                    name="maxGuests"
                    min={1}
                    defaultValue={editingRoom.maxGuests}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="hasPrivateBath"
                    id="edit-hasPrivateBath"
                    value="true"
                    defaultChecked={editingRoom.hasPrivateBath}
                    className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <label htmlFor="edit-hasPrivateBath" className="text-sm text-[var(--foreground)]">
                    Baño privado
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingRoom(null)}
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
        )
      }

      {/* Modal confirmar eliminar habitación */}
      {roomToDelete &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 min-h-screen flex items-center justify-center overflow-y-auto bg-black/50 p-4 py-8"
            style={{ minHeight: "100dvh" }}
            onClick={() => { setRoomToDelete(null); setDeleteError(null); }}
          >
            <div
              className="my-auto w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Eliminar habitación</h3>
                <button
                  type="button"
                  onClick={() => { setRoomToDelete(null); setDeleteError(null); }}
                  className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--muted)]/20 hover:text-[var(--foreground)]"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex gap-3 rounded-lg bg-[var(--destructive)]/10 p-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--destructive)]" />
                <p className="text-sm text-[var(--foreground)]">
                  Al eliminar la habitación <strong>Hab. {roomToDelete.roomNumber}</strong> se eliminarán también todas las reservas y pagos asociados. Esta acción no se puede deshacer.
                </p>
              </div>
              <p className="mt-3 text-sm text-[var(--muted)]">¿Desea continuar?</p>
              {deleteError && (
                <p className="mt-2 rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
                  {deleteError}
                </p>
              )}
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setRoomToDelete(null); setDeleteError(null); }}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/20"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={!!deletingId}
                  className="flex-1 rounded-lg bg-[var(--destructive)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {deletingId ? "Eliminando…" : "Eliminar"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Buscar por número de habitación..."
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
            { value: "AVAILABLE", label: "Disponible" },
            { value: "OCCUPIED", label: "Ocupada" },
            { value: "CLEANING", label: "Limpieza" },
            { value: "MAINTENANCE", label: "Mantenimiento" },
          ]}
          className="min-w-[160px]"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((room) => (
          <div
            key={room.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 shadow-sm">
                  <BedDouble className="h-6 w-6 text-[var(--primary)]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-[var(--foreground)]">Hab. {room.roomNumber}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    {ROOM_TYPE_LABELS[room.type] ?? room.type} · Piso {room.floor}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${statusColors[room.status] ?? ""}`}>
                  {statusLabels[room.status] ?? room.status}
                </span>
                <button
                  type="button"
                  onClick={() => { setDeleteError(null); setRoomToDelete(room); }}
                  disabled={deletingId === room.id}
                  className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] disabled:opacity-50"
                  title="Eliminar habitación"
                  aria-label="Eliminar habitación"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {formatCLP(room.pricePerNight)}/noche
              </span>
              <button
                type="button"
                onClick={() => setEditingRoom(room)}
                className="text-sm font-medium text-[var(--primary)] transition-colors hover:underline"
              >
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
