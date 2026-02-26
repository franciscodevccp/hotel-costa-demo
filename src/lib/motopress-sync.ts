import { prisma } from "@/lib/db";
import type { ReservationStatus } from "@prisma/client";

const MOTOPRESS_URL = process.env.MOTOPRESS_URL;
const CONSUMER_KEY = process.env.MOTOPRESS_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MOTOPRESS_CONSUMER_SECRET;

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

export async function fetchMotopressBookings(): Promise<MotopressBooking[]> {
  if (!MOTOPRESS_URL) throw new Error("MOTOPRESS_URL no está configurado");
  const authHeader = getAuthHeader();
  const response = await fetch(
    `${MOTOPRESS_URL.replace(/\/$/, "")}/wp-json/mphb/v1/bookings?per_page=100`,
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
  error?: string;
};

export async function syncMotopressBookings(): Promise<SyncMotopressResult> {
  let reservationsFound = 0;
  let reservationsCreated = 0;
  let reservationsSkipped = 0;

  try {
    const establishmentId = await getEstablishmentId();
    const mpBookings = await fetchMotopressBookings();
    reservationsFound = mpBookings.length;

    for (const mp of mpBookings) {
      const motopressId = String(mp.id);

      const existing = await prisma.reservation.findUnique({
        where: { motopressId },
      });

      if (existing) {
        const newStatus = mapStatus(mp.status);
        if (existing.status !== newStatus) {
          await prisma.reservation.update({
            where: { motopressId },
            data: { status: newStatus, syncedAt: new Date() },
          });
        }
        continue;
      }

      const firstAcc = mp.reserved_accommodations[0];
      // MotoPress envía accommodation (instancia) y accommodation_type (tipo); nuestro seed usa el ID del tipo
      const externalIdToMatch = firstAcc?.accommodation_type ?? firstAcc?.accommodation;
      const room = externalIdToMatch
        ? await prisma.room.findFirst({
            where: { establishmentId, externalId: String(externalIdToMatch) },
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
          checkIn: new Date(mp.check_in_date),
          checkOut: new Date(mp.check_out_date),
          numGuests,
          totalAmount,
          status: mapStatus(mp.status),
          source: "MOTOPRESS",
          motopressId,
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
