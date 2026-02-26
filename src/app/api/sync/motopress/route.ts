import { NextResponse } from "next/server";
import { syncMotopressBookings } from "@/lib/motopress-sync";

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
  try {
    const result = await syncMotopressBookings();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
