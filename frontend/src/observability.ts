/**
 * Deliberately not the api/client.ts wrapper: reporting an error must never
 * trigger a token refresh/retry cycle, throw an ApiError, or show a toast —
 * it has to survive even a crash before login.
 */
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function reportError(title: string, stack: string) {
  try {
    void fetch(`${BASE}/erros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.slice(0, 500), stack: stack.slice(0, 8000) }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* reporting an error must never itself throw */
  }
}

export function installGlobalErrorReporting() {
  window.addEventListener('error', (event) => {
    const stack = event.error?.stack ?? `${event.message}\n    at ${event.filename}:${event.lineno}:${event.colno}`;
    reportError(event.message || 'Erro desconhecido', stack);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const title = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? (reason.stack ?? title) : title;
    reportError(title || 'Rejeição não tratada', stack);
  });
}
