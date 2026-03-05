"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Lock,
  Save,
  Users,
  Check,
} from "lucide-react";
import {
  saveEstablishment,
  adminChangeUserPassword,
} from "@/app/dashboard/settings/actions";
import type { Establishment } from "@/lib/types/database";

interface Worker {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "RECEPTIONIST";
}

interface AdminSettingsViewProps {
  establishment: Establishment | null;
  workers: Worker[];
}

export function AdminSettingsView({
  establishment: initialEstablishment,
  workers,
}: AdminSettingsViewProps) {
  const router = useRouter();

  // ─── Estado del establecimiento ─────────────────────────────────
  const [establishment, setEstablishment] = useState({
    name: initialEstablishment?.name ?? "",
    address: initialEstablishment?.address ?? "",
    phone: initialEstablishment?.phone ?? "",
    email: initialEstablishment?.email ?? "",
  });
  const [savingEstablishment, setSavingEstablishment] = useState(false);
  const [saveMessage, setSaveMessage] = useState<"ok" | "error" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const establishmentId = initialEstablishment?.id;
  const canSaveEstablishment = !!establishmentId;

  const handleSaveEstablishment = async () => {
    if (!establishmentId) return;
    setSaveMessage(null);
    setSaveError(null);
    setSavingEstablishment(true);
    const result = await saveEstablishment({}, establishment);
    setSavingEstablishment(false);
    if (result.error) {
      setSaveMessage("error");
      setSaveError(result.error);
    } else {
      setSaveMessage("ok");
      router.refresh();
    }
  };

  // ─── Estado del cambio de contraseña de usuarios ────────────────
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({});
  const [userPwStatus, setUserPwStatus] = useState<Record<string, { msg: "ok" | "error"; error?: string }>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const handleAdminChangePassword = async (userId: string) => {
    const pw = userPasswords[userId]?.trim();
    if (!pw || pw.length < 6) {
      setUserPwStatus((prev) => ({ ...prev, [userId]: { msg: "error", error: "Mínimo 6 caracteres" } }));
      return;
    }
    setSavingUserId(userId);
    setUserPwStatus((prev) => {
      const copy = { ...prev };
      delete copy[userId];
      return copy;
    });
    const result = await adminChangeUserPassword({}, { userId, newPassword: pw });
    setSavingUserId(null);
    if (result.error) {
      setUserPwStatus((prev) => ({ ...prev, [userId]: { msg: "error", error: result.error } }));
    } else {
      setUserPwStatus((prev) => ({ ...prev, [userId]: { msg: "ok" } }));
      setUserPasswords((prev) => ({ ...prev, [userId]: "" }));
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Configuración
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Datos del hostal, seguridad y gestión de usuarios.
        </p>
      </div>

      {/* ─── Datos del establecimiento ─── */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
          <Building2 className="h-5 w-5 text-[var(--primary)]" />
          Datos del hostal
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Nombre, dirección y contacto del establecimiento.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              Nombre
            </label>
            <input
              type="text"
              value={establishment.name}
              onChange={(e) =>
                setEstablishment((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Ej. Hotel de la Costa"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]">
              <MapPin className="h-4 w-4 text-[var(--muted)]" />
              Dirección
            </label>
            <input
              type="text"
              value={establishment.address}
              onChange={(e) =>
                setEstablishment((p) => ({ ...p, address: e.target.value }))
              }
              placeholder="Calle, número, ciudad"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]">
              <Phone className="h-4 w-4 text-[var(--muted)]" />
              Teléfono
            </label>
            <input
              type="text"
              value={establishment.phone}
              onChange={(e) =>
                setEstablishment((p) => ({ ...p, phone: e.target.value }))
              }
              placeholder="+56 9 1234 5678"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]">
              <Mail className="h-4 w-4 text-[var(--muted)]" />
              Email
            </label>
            <input
              type="email"
              value={establishment.email}
              onChange={(e) =>
                setEstablishment((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="contacto@hotel.cl"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
        </div>
        {canSaveEstablishment && (
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveEstablishment}
              disabled={savingEstablishment}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingEstablishment ? "Guardando…" : "Guardar cambios"}
            </button>
            {saveMessage === "ok" && (
              <span className="text-sm text-[var(--success)]">
                Datos guardados correctamente.
              </span>
            )}
            {saveMessage === "error" && (
              <span className="text-sm text-[var(--destructive)]">
                {saveError ?? "No se pudieron guardar los datos."}
              </span>
            )}
          </div>
        )}
      </section>


      {/* ─── Gestión de contraseñas de usuarios ─── */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
          <Users className="h-5 w-5 text-[var(--primary)]" />
          Contraseñas de usuarios
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Establece una nueva contraseña para cualquier usuario del sistema.
        </p>
        <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="px-4 py-3 font-medium text-[var(--foreground)]">
                  Nombre
                </th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)]">
                  Email
                </th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)]">
                  Rol
                </th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)]">
                  Nueva contraseña
                </th>
              </tr>
            </thead>
            <tbody>
              {workers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-[var(--muted)]"
                  >
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                workers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-[var(--foreground)]">
                        {user.fullName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.role === "ADMIN"
                          ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "bg-[var(--muted)]/10 text-[var(--muted)]"
                          }`}
                      >
                        {user.role === "ADMIN" ? "Administrador" : "Recepcionista"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          value={userPasswords[user.id] ?? ""}
                          onChange={(e) =>
                            setUserPasswords((prev) => ({
                              ...prev,
                              [user.id]: e.target.value,
                            }))
                          }
                          placeholder="Nueva contraseña"
                          className="w-40 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                        <button
                          type="button"
                          onClick={() => handleAdminChangePassword(user.id)}
                          disabled={
                            savingUserId === user.id ||
                            !(userPasswords[user.id]?.trim())
                          }
                          className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                        >
                          {savingUserId === user.id ? (
                            "Guardando…"
                          ) : (
                            <>
                              <Save className="h-3.5 w-3.5" />
                              Cambiar
                            </>
                          )}
                        </button>
                        {userPwStatus[user.id]?.msg === "ok" && (
                          <span className="flex items-center gap-1 text-xs text-[var(--success)]">
                            <Check className="h-3.5 w-3.5" />
                            Actualizada
                          </span>
                        )}
                        {userPwStatus[user.id]?.msg === "error" && (
                          <span className="text-xs text-[var(--destructive)]">
                            {userPwStatus[user.id]?.error}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
