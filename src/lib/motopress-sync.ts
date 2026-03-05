import { prisma } from "@/lib/db";
import type { ReservationStatus } from "@prisma/client";

const MOTOPRESS_URL = process.env.MOTOPRESS_URL;
const CONSUMER_KEY = process.env.MOTOPRESS_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MOTOPRESS_CONSUMER_SECRET;

/** Días hacia atrás desde hoy: solo se sincronizan reservas con check-out >= (hoy - SYNC_DAYS). 0 = sin filtro (todas). */
const SYNC_DAYS = (() => {
  const raw = process.env.MOTOPRESS_SYNC_DAYS;
  if (raw === undefined || raw === "") return 90;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) return 90;
  return n;
})();

function getAuthHeader(): string {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error("MOTOPRESS_CONSUMER_KEY y MOTOPRESS_CONSUMER_SECRET son obligatorios");
  }
  return Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
}

export interface MotopressBooking {
  id: number;
  status: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  note?: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  reserved_accommodations: {
    accommodation: number;
    accommodation_type?: number; // ID del tipo de habitación en WordPress (este es el que mapeamos con Room.externalId)
    adults: number;
    children?: number;
  }[];
}

async function fetchMotopressBookings(): Promise<MotopressBooking[]> {
  if (!MOTOPRESS_URL) throw new Error("MOTOPRESS_URL no está configurado");
  const authHeader = getAuthHeader();
  const response = await fetch(
    `${MOTOPRESS_URL.replace(/\/$/, "")}/wp-json/mphb/v1/bookings?per_page=100&orderby=id&order=desc`,
    {
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MotoPress API: ${response.status} ${response.statusText}. ${text.slice(0, 200)}`);
  }

  return response.json();
}

function mapStatus(mpStatus: string): ReservationStatus {
  const statusMap: Record<string, ReservationStatus> = {
    confirmed: "CONFIRMED",
    pending: "PENDING",
    cancelled: "CANCELLED",
    abandoned: "CANCELLED",
  };
  return statusMap[mpStatus?.toLowerCase()] ?? "PENDING";
}

/** Parsea "YYYY-MM-DD" como día local (evita desfase por medianoche UTC). */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Filtra reservas a solo las "recientes": check-out >= (hoy - SYNC_DAYS). Si SYNC_DAYS es 0, no filtra. */
function filterRecentBookings(bookings: MotopressBooking[]): MotopressBooking[] {
  if (SYNC_DAYS === 0) return bookings;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - SYNC_DAYS);
  return bookings.filter((mp) => {
    const checkOut = parseLocalDate(mp.check_out_date);
    return checkOut >= cutoff;
  });
}

async function getEstablishmentId(): Promise<string> {
  const fromEnv = process.env.MOTOPRESS_ESTABLISHMENT_ID;
  if (fromEnv) return fromEnv;
  const first = await prisma.establishment.findFirst({ select: { id: true } });
  if (!first) throw new Error("No hay establecimiento en la base de datos");
  return first.id;
}

export type SyncMotopressResult = {
  success: boolean;
  reservationsFound: number;
  reservationsCreated: number;
  reservationsSkipped: number;
  /** Reservas que ya estaban en el sistema (no se duplican, solo se actualiza estado si cambió). */
  reservationsAlreadyInSystem?: number;
  /** Reservas que el usuario eliminó y están en la lista de ignoradas (no se reimportan). */
  reservationsIgnoredByUser?: number;
  /** Reservas descartadas por el filtro de "solo recientes" (MOTOPRESS_SYNC_DAYS). */
  reservationsFilteredOut?: number;
  error?: string;
};

export async function syncMotopressBookings(): Promise<SyncMotopressResult> {
  let reservationsFound = 0;
  let reservationsCreated = 0;
  let reservationsSkipped = 0;
  let reservationsAlreadyInSystem = 0;
  let reservationsIgnoredByUser = 0;

  try {
    const establishmentId = await getEstablishmentId();
    const [mpBookingsRaw, ignoredMotopressIds] = await Promise.all([
      fetchMotopressBookings(),
      prisma.motopressIgnoredBooking.findMany({
        where: { establishmentId },
        select: { motopressId: true },
      }).then((rows) => new Set(rows.map((r) => r.motopressId))),
    ]);
    const mpBookings = filterRecentBookings(mpBookingsRaw);
    const reservationsFilteredOut = mpBookingsRaw.length - mpBookings.length;
    reservationsFound = mpBookings.length;

    for (const mp of mpBookings) {
      const motopressIdStr = String(mp.id);
      // Evitar duplicados: ya existe si la reserva vino de la web O si la creamos nosotros y la enviamos (push)
      const existing = await prisma.reservation.findUnique({
        where: { motopressId: motopressIdStr },
      });

      if (existing) {
        reservationsAlreadyInSystem++;
        const newStatus = mapStatus(mp.status);
        if (existing.status !== newStatus) {
          await prisma.reservation.update({
            where: { motopressId: motopressIdStr },
            data: { status: newStatus, syncedAt: new Date() },
          });
        }
        continue;
      }

      // No reimportar reservas que el usuario eliminó y no quiere volver a ver
      if (ignoredMotopressIds.has(motopressIdStr)) {
        reservationsIgnoredByUser++;
        continue;
      }

      const firstAcc = mp.reserved_accommodations[0];
      // MotoPress: accommodation = ID unidad (habitación concreta), accommodation_type = ID tipo. Push requiere unidad; sync puede matchear por uno u otro.
      const unitId = firstAcc?.accommodation;
      const typeId = firstAcc?.accommodation_type;
      const room =
        unitId || typeId
          ? await prisma.room.findFirst({
              where: {
                establishmentId,
                externalId: { in: [String(unitId), String(typeId)].filter(Boolean) },
              },
            })
          : null;

      if (!room) {
        reservationsSkipped++;
        continue;
      }

      const fullName = [mp.customer.first_name, mp.customer.last_name].filter(Boolean).join(" ") || "Huésped MotoPress";
      const email = mp.customer.email || undefined;

      let guest = email
        ? await prisma.guest.findFirst({
            where: { establishmentId, email },
          })
        : null;

      if (!guest) {
        guest = await prisma.guest.create({
          data: {
            establishmentId,
            fullName,
            email: email ?? null,
            phone: mp.customer.phone ?? null,
          },
        });
      }

      const adults = mp.reserved_accommodations[0]?.adults ?? 1;
      const children = mp.reserved_accommodations[0]?.children ?? 0;
      const numGuests = adults + children || 1;
      const totalAmount = Math.round(Number(mp.total_price)) || 0;

      await prisma.reservation.create({
        data: {
          establishmentId,
          roomId: room.id,
          guestId: guest.id,
          checkIn: parseLocalDate(mp.check_in_date),
          checkOut: parseLocalDate(mp.check_out_date),
          numGuests,
          totalAmount,
          status: mapStatus(mp.status),
          source: "MOTOPRESS",
          motopressId: motopressIdStr,
          notes: mp.note ?? null,
          syncedAt: new Date(),
        },
      });
      reservationsCreated++;
    }

    await prisma.syncLog.create({
      data: {
        source: "motopress",
        status: "success",
        reservationsFound,
        reservationsCreated,
        reservationsSkipped,
      },
    });

    return {
      success: true,
      reservationsFound,
      reservationsCreated,
      reservationsSkipped,
      ...(reservationsAlreadyInSystem > 0 && { reservationsAlreadyInSystem }),
      ...(reservationsIgnoredByUser > 0 && { reservationsIgnoredByUser }),
      ...(reservationsFilteredOut > 0 && { reservationsFilteredOut }),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.syncLog.create({
      data: {
        source: "motopress",
        status: "error",
        message,
        reservationsFound,
        reservationsCreated,
        reservationsSkipped,
      },
    });
    return {
      success: false,
      reservationsFound,
      reservationsCreated,
      reservationsSkipped,
      error: message,
    };
  }
}
