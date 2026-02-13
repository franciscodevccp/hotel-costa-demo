import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import type { MockSession } from "@/lib/types/database";

const COOKIE_NAME = "mock_session";

/** Para proxy/middleware (Edge) */
export function getMockSession(request: NextRequest): MockSession | null {
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    return JSON.parse(cookie) as MockSession;
  } catch {
    return null;
  }
}

/** Para Server Components */
export async function getMockSessionServer(): Promise<MockSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    return JSON.parse(cookie) as MockSession;
  } catch {
    return null;
  }
}
