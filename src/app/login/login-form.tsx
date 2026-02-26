"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const MSG_CREDENCIALES = "Credenciales incorrectas";
  const MSG_RATE_LIMIT = "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const invalid =
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !password;

    if (invalid) {
      setError(MSG_CREDENCIALES);
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });
      const status = res && "status" in res ? (res as { status?: number }).status : undefined;
      if (status === 429) {
        setError(MSG_RATE_LIMIT);
        setLoading(false);
        return;
      }
      if (res?.error) {
        setError(MSG_CREDENCIALES);
        setLoading(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError(MSG_CREDENCIALES);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className={`w-full rounded-md border bg-[var(--card)] px-3 py-2.5 text-sm transition-colors ${
            error
              ? "border-[var(--destructive)] focus:outline-none focus:ring-2 focus:ring-[var(--destructive)]/50"
              : "border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
          }`}
          placeholder="tu@email.com"
          aria-invalid={!!error}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className={`w-full rounded-md border bg-[var(--card)] px-3 py-2.5 text-sm transition-colors ${
            error
              ? "border-[var(--destructive)] focus:outline-none focus:ring-2 focus:ring-[var(--destructive)]/50"
              : "border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
          }`}
          placeholder="••••••••"
          aria-invalid={!!error}
        />
      </div>
      {error && (
        <div
          id="login-error"
          className="flex items-start gap-2 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-2.5 text-sm text-[var(--destructive)]"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 transition-opacity"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
