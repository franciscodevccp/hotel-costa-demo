"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReservationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Opcional: log en consola en desarrollo
    if (process.env.NODE_ENV === "development") {
      console.error("[ReservationsError]", error?.message, error?.digest);
    }
  }, [error]);

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm text-[var(--muted)]">
        Algo falló al cargar las reservas. La reserva puede haberse eliminado correctamente.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/20"
        >
          Reintentar
        </button>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Recargar página
        </button>
      </div>
    </div>
  );
}
