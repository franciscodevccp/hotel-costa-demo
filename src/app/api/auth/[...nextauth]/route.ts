import { handlers } from "@/lib/auth";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

const { GET, POST: nextAuthPost } = handlers;

const CREDENTIALS_CALLBACK = "callback/credentials";

function isCredentialsCallback(url: string): boolean {
  return url.includes(CREDENTIALS_CALLBACK);
}

async function POST(request: Request): Promise<Response> {
  if (isCredentialsCallback(request.url)) {
    const { allowed } = checkLoginRateLimit(request);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Demasiados intentos. Espera 15 minutos." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const response = await nextAuthPost(request as NextRequest);

  if (isCredentialsCallback(request.url)) {
    const location = response.headers.get("location") ?? "";
    const isRedirectToLoginWithError =
      response.status >= 302 &&
      response.status < 400 &&
      location.includes("/login") &&
      location.includes("error=");
    if (isRedirectToLoginWithError) {
      recordLoginFailure(request);
    } else if (response.ok || (response.status >= 302 && response.status < 400 && !location.includes("error="))) {
      recordLoginSuccess(request);
    }
  }

  return response;
}

export { GET, POST };
