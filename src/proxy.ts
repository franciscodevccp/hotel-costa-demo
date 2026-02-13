import { type NextRequest, NextResponse } from "next/server";
import { getMockSession } from "@/lib/mock-auth";

export async function proxy(request: NextRequest) {
  const session = getMockSession(request);
  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const isAuthApi = request.nextUrl.pathname.startsWith("/api/auth");

  // Sin sesión y no está en login ni en API auth → redirigir a login
  if (!session && !isLoginPage && !isAuthApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Con sesión y está en login → redirigir a dashboard
  if (session && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
