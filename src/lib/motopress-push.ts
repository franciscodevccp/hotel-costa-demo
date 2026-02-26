/**
 * Envía reservas de MiHostal a MotoPress para bloquear fechas en la web del hotel.
 * Evita que un cliente reserve por la web las mismas fechas que ya se ocuparon desde el sistema.
 */

const MOTOPRESS_URL = process.env.MOTOPRESS_URL;
const CONSUMER_KEY = process.env.MOTOPRESS_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MOTOPRESS_CONSUMER_SECRET;

function getAuthHeader(): string {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error("MOTOPRESS_CONSUMER_KEY y MOTOPRESS_CONSUMER_SECRET son obligatorios para enviar a la web");
  }
  return Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
}

export interface PushBookingParams {
  accommodationExternalId: string; // ID de la **unidad** de alojamiento en MotoPress (Room.externalId debe ser el ID de unidad, no el de tipo)
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children?: number;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone?: string;
  note?: string;
}

/**
 * Crea una reserva en MotoPress para bloquear las fechas en la web.
 * Devuelve el ID de la reserva en MotoPress o null si falla.
 */
export async function pushBookingToMotopress(params: PushBookingParams): Promise<string | null> {
  if (!MOTOPRESS_URL) return null;
  try {
    const accommodationId = parseInt(params.accommodationExternalId, 10);
    if (Number.isNaN(accommodationId)) return null;

    const body = {
      reserved_accommodations: [
        {
          accommodation: accommodationId,
          adults: params.adults,
          children: params.children ?? 0,
        },
      ],
      check_in_date: params.checkIn.toISOString().split("T")[0],
      check_out_date: params.checkOut.toISOString().split("T")[0],
      status: "confirmed",
      note: params.note ?? "Reserva creada desde MiHostal",
      customer: {
        first_name: params.guestFirstName,
        last_name: params.guestLastName,
        email: params.guestEmail,
        phone: params.guestPhone ?? "",
      },
    };

    const response = await fetch(
      `${MOTOPRESS_URL.replace(/\/$/, "")}/wp-json/mphb/v1/bookings`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${getAuthHeader()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[motopress-push] Error al crear reserva en MotoPress:", response.status, error.slice(0, 200));
      return null;
    }

    const data = (await response.json()) as { id?: number };
    return data.id != null ? String(data.id) : null;
  } catch (error) {
    console.error("[motopress-push] Error de conexión con MotoPress:", error);
    return null;
  }
}

/**
 * Cancela una reserva en MotoPress para liberar las fechas en la web.
 */
export async function cancelBookingInMotopress(motopressBookingId: string): Promise<boolean> {
  if (!MOTOPRESS_URL) return false;
  try {
    const response = await fetch(
      `${MOTOPRESS_URL.replace(/\/$/, "")}/wp-json/mphb/v1/bookings/${motopressBookingId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${getAuthHeader()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      }
    );
    return response.ok;
  } catch (error) {
    console.error("[motopress-push] Error al cancelar reserva en MotoPress:", error);
    return false;
  }
}
