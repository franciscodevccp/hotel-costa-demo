import { NextResponse } from "next/server";
import { syncMotopressBookings, fetchMotopressBookings } from "@/lib/motopress-sync";

const SYNC_SECRET = process.env.SYNC_SECRET;

function isAuthorized(request: Request): boolean {
  if (!SYNC_SECRET) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${SYNC_SECRET}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === SYNC_SECRET;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const result = await syncMotopressBookings();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const url = new URL(request.url);
  const preview = url.searchParams.get("preview") === "1" || url.searchParams.get("preview") === "true";

  if (preview) {
    try {
      const bookings = await fetchMotopressBookings();
      const summary = bookings.map((b) => ({
        id: b.id,
        status: b.status,
        check_in_date: b.check_in_date,
        check_out_date: b.check_out_date,
        total_price: b.total_price,
        customer: b.customer,
        reserved_accommodations: b.reserved_accommodations,
        accommodation_ids: b.reserved_accommodations?.map((a) => a.accommodation) ?? [],
      }));
      return NextResponse.json({
        message: "Vista previa: lo que envía MotoPress (no se creó ninguna reserva)",
        total: bookings.length,
        bookings: summary,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  }

  try {
    const result = await syncMotopressBookings();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
