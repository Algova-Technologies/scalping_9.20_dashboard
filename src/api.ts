// All backend calls go through here.
// In dev: Vite proxies /api in dev (see vite.config.ts).
// In prod: Netlify rewrites proxy /api in netlify.toml and public/_redirects.
// Optional env override: VITE_DASHBOARD_API_URL or VITE_API_BASE_URL.
const BASE = import.meta.env?.VITE_DASHBOARD_API_URL || import.meta.env?.VITE_API_BASE_URL || '';

// Every screen of every project refreshes its data this often (main.tsx sets it as the default).
export const LIVE_MS = 1000;

// Carries the status so callers can tell a deterministic 404 (this project does not
// exist) from a transient failure worth retrying.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** True for "the server understood and says no" — retrying or polling it is pointless. */
export const isClientError = (e: unknown) => e instanceof ApiError && e.status >= 400 && e.status < 500;
export const isNotFound = (e: unknown) => e instanceof ApiError && e.status === 404;

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    // FastAPI puts the reason in { detail }; surface it so forms can show "email already exists" etc.
    const body = await res.json().catch(() => null);
    throw new ApiError(
      typeof body?.detail === 'string' ? body.detail : `${res.status} ${res.statusText}`,
      res.status,
    );
  }
  return res.json();
}
