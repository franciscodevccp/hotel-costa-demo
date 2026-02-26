"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { syncMotopressReservations } from "@/app/dashboard/reservations/actions";

export function SyncMotopressButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await syncMotopressReservations();
      if (result.success) {
        setMessage(
          `${result.reservationsCreated} nueva(s) de ${result.reservationsFound} encontrada(s)` +
            (result.reservationsSkipped > 0 ? ` (${result.reservationsSkipped} omitidas sin habitación mapeada)` : "")
        );
        router.refresh();
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch {
      setMessage("Error al sincronizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleSync}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] shadow-sm transition-all hover:bg-[var(--muted)]/20 disabled:opacity-50 w-full md:w-auto"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Sincronizando…" : "Sincronizar con web"}
      </button>
      {message && (
        <span className="text-xs text-[var(--muted)] max-w-[280px] text-right">
          {message}
        </span>
      )}
    </div>
  );
}
