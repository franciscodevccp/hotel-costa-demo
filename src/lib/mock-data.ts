import type { Establishment, User } from "@/lib/types/database";

/** Datos mock para el establecimiento demo */
export const MOCK_ESTABLISHMENT: Establishment = {
  id: "est-1",
  name: "Hostal Demo Concepción",
  address: "Barros Arana 123, Concepción",
  phone: "+56 41 123 4567",
  email: "contacto@hostaldemo.cl",
  total_rooms: 20,
  logo_url: null,
  created_at: "2026-01-01T00:00:00Z",
};

/** Usuarios mock para la sección de trabajadores */
export const MOCK_WORKERS: User[] = [
  {
    id: "user-1",
    auth_id: null,
    establishment_id: "est-1",
    full_name: "Administrador Demo",
    email: "admin@hostaldemo.cl",
    role: "admin",
    avatar_url: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "user-2",
    auth_id: null,
    establishment_id: "est-1",
    full_name: "Recepcionista Demo",
    email: "recepcionista@hostaldemo.cl",
    role: "receptionist",
    avatar_url: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
];
