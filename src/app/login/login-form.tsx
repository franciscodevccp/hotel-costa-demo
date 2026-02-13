"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_USERS = [
  { email: "admin@hostaldemo.cl", label: "Admin" },
  { email: "recepcionista@hostaldemo.cl", label: "Recepcionista" },
] as const;

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSelectUser(user: (typeof DEMO_USERS)[number]) {
    setError(null);
    setLoading(user.email);

    try {
      const res = await fetch("/api/auth/mock-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al iniciar sesión");
        setLoading(null);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Error de conexión");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        Elige un usuario para entrar (demo):
      </p>
      <ul className="space-y-2">
        {DEMO_USERS.map((user) => (
          <li key={user.email}>
            <button
              type="button"
              onClick={() => handleSelectUser(user)}
              disabled={loading !== null}
              className="flex w-full items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-left transition hover:bg-[var(--accent)] hover:opacity-90 disabled:opacity-50"
            >
              <span className="font-medium text-[var(--foreground)]">
                {user.label}
              </span>
              <span className="truncate text-xs text-[var(--muted)]">
                {loading === user.email ? "Entrando…" : user.email}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p className="text-sm text-[var(--destructive)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
