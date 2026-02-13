import { NextResponse } from "next/server";
import type { MockSession } from "@/lib/types/database";

const DEMO_USERS: Array<{ email: string; password: string; label: string } & MockSession> = [
  {
    email: "admin@hostaldemo.cl",
    password: "admin123",
    label: "Admin",
    full_name: "Administrador Demo",
    role: "admin",
  },
  {
    email: "recepcionista@hostaldemo.cl",
    password: "admin123",
    label: "Recepcionista",
    full_name: "Recepcionista Demo",
    role: "receptionist",
  },
];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { email } = body as { email?: string };

  const user = DEMO_USERS.find((u) => u.email === email);
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 400 });
  }

  const session: MockSession = {
    full_name: user.full_name,
    email: user.email,
    role: user.role,
  };

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set("mock_session", JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 horas
    path: "/",
  });

  return response;
}
