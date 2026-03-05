/**
 * Rate limit para login: máximo MAX_ATTEMPTS intentos fallidos por IP en WINDOW_MS.
 * Store en memoria (válido para una sola instancia; con varias instancias usar Redis).
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 5;

const store = new Map<
  string,
  { count: number; firstAttemptAt: number }
>();

function getClientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function isOverLimit(clientId: string): boolean {
  const now = Date.now();
  const entry = store.get(clientId);
  if (!entry) return false;
  if (now - entry.firstAttemptAt >= WINDOW_MS) {
    store.delete(clientId);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(clientId: string): void {
  const now = Date.now();
  const entry = store.get(clientId);
  if (!entry) {
    store.set(clientId, { count: 1, firstAttemptAt: now });
    return;
  }
  if (now - entry.firstAttemptAt >= WINDOW_MS) {
    store.set(clientId, { count: 1, firstAttemptAt: now });
    return;
  }
  entry.count += 1;
}

function clearAttempts(clientId: string): void {
  store.delete(clientId);
}

export function checkLoginRateLimit(request: Request): { allowed: boolean } {
  const clientId = getClientId(request);
  if (isOverLimit(clientId)) return { allowed: false };
  return { allowed: true };
}

export function recordLoginFailure(request: Request): void {
  recordFailedAttempt(getClientId(request));
}

export function recordLoginSuccess(request: Request): void {
  clearAttempts(getClientId(request));
}
