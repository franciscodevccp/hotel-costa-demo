"use client";

import { useState } from "react";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  Save,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import type { Establishment, User } from "@/lib/types/database";

interface AdminSettingsViewProps {
  establishment: Establishment | null;
  workers: User[];
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "receptionist", label: "Recepcionista" },
];

export function AdminSettingsView({
  establishment: initialEstablishment,
  workers: initialWorkers,
}: AdminSettingsViewProps) {
  const [establishment, setEstablishment] = useState({
    name: initialEstablishment?.name ?? "",
    address: initialEstablishment?.address ?? "",
    phone: initialEstablishment?.phone ?? "",
    email: initialEstablishment?.email ?? "",
  });
  const [workers, setWorkers] = useState(initialWorkers);
  const [saveMessage, setSaveMessage] = useState<"ok" | "error" | null>(null);

  const establishmentId = initialEstablishment?.id;
  const canSaveEstablishment = !!establishmentId;

  const handleSaveEstablishment = () => {
    if (!establishmentId) return;
    setSaveMessage(null);
    // Datos mock: simular guardado exitoso
    setSaveMessage("ok");
  };

  const handleRoleChange = (userId: string, newRole: User["role"]) => {
    setWorkers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  };

  const handleToggleActive = (user: User) => {
    setWorkers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, is_active: !u.is_active } : u
      )
    );
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Configuración
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Datos del hostal y gestión de trabajadores (demo con datos mock).
        </p>
      </div>

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
              placeholder="Ej. Hostal Demo Concepción"
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
              placeholder="contacto@hostal.cl"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
        </div>
        {canSaveEstablishment && (
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveEstablishment}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90"
            >
              <Save className="h-4 w-4" />
              Guardar cambios
            </button>
            {saveMessage === "ok" && (
              <span className="text-sm text-[var(--success)]">
                Datos guardados correctamente (demo: solo actualiza la UI).
              </span>
            )}
            {saveMessage === "error" && (
              <span className="text-sm text-[var(--destructive)]">
                No se pudieron guardar los datos.
              </span>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
          <Users className="h-5 w-5 text-[var(--primary)]" />
          Trabajadores
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Lista de usuarios del hostal. Puedes cambiar el rol y activar o
          desactivar cada uno (demo: cambios solo en memoria).
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
                  Estado
                </th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {workers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-[var(--muted)]"
                  >
                    No hay trabajadores cargados.
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
                        {user.full_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <CustomSelect
                        value={user.role}
                        onChange={(value) =>
                          handleRoleChange(user.id, value as User["role"])
                        }
                        options={ROLE_OPTIONS}
                        placeholder="Rol"
                        aria-label={`Rol de ${user.full_name}`}
                        className="min-w-[140px]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.is_active
                            ? "bg-[var(--success)]/10 text-[var(--success)]"
                            : "bg-[var(--muted)]/10 text-[var(--muted)]"
                        }`}
                      >
                        {user.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user)}
                        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          user.is_active
                            ? "border border-[var(--muted)]/50 bg-[var(--background)] text-[var(--muted)] hover:border-[var(--destructive)]/40 hover:bg-[var(--destructive)]/5 hover:text-[var(--destructive)]"
                            : "border border-[var(--success)]/50 bg-[var(--success)]/5 text-[var(--success)] hover:bg-[var(--success)]/10"
                        }`}
                        title={user.is_active ? "Desactivar" : "Activar"}
                        aria-label={
                          user.is_active ? "Desactivar usuario" : "Activar usuario"
                        }
                      >
                        {user.is_active ? (
                          <>
                            <ToggleRight className="h-4 w-4" aria-hidden />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4" aria-hidden />
                            Activar
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Demo con datos mock: los cambios se reflejan solo en la sesión actual.
        </p>
      </section>
    </div>
  );
}
