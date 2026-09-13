import type { SessionDTO } from '@shared/contracts';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * The access token lives only in memory: it does not go to localStorage, so a
 * script injected into the page cannot read it. What survives a reload is the
 * refresh token, kept by the server in an httpOnly cookie.
 */
let accessToken: string | null = null;
let onSessionLost: (() => void) | null = null;

export const setToken = (t: string | null) => {
  accessToken = t;
};
export const onExpired = (fn: () => void) => {
  onSessionLost = fn;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const m = body?.message;
    // The ValidationPipe returns an array of messages; we show the first.
    if (Array.isArray(m)) return m[0] ?? 'Não foi possível concluir.';
    if (typeof m === 'string') return m;
  } catch {
    /* response with no JSON body */
  }
  return 'Não foi possível concluir. Tente de novo.';
}

async function send<T>(
  path: string,
  init: RequestInit,
  alreadyRefreshed = false,
): Promise<T> {
  // A FormData body (file upload) must not get a manual Content-Type — the
  // browser needs to set its own, with the multipart boundary included.
  const isFormData = init.body instanceof FormData;

  const response = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  // 401 with an expired token: refresh once and retry the original call.
  if (response.status === 401 && !alreadyRefreshed && !path.startsWith('/auth/')) {
    const refreshed = await refreshSession();
    if (refreshed) return send<T>(path, init, true);
    onSessionLost?.();
    throw new ApiError(401, 'Sessão expirada. Entre de novo.');
  }

  if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function refreshSession(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!r.ok) return false;
    const session: SessionDTO = await r.json();
    accessToken = session.accessToken;
    return true;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(path: string) => send<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    send<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body: unknown) =>
    send<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    send<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => send<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, body: FormData) => send<T>(path, { method: 'POST', body }),
  refreshSession,
};
