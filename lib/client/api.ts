import { getAuthToken, removeAuthToken } from "@/lib/storage";

export interface ApiError extends Error {
  status: number;
}

function makeError(message: string, status: number): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  return err;
}

export function authToken(): string {
  if (typeof document !== "undefined") {
    const cookie = document.cookie.match(/(?:^|; )token=([^;]+)/)?.[1];
    if (cookie) return cookie;
  }
  return getAuthToken() || "";
}

/**
 * Fetch an admin API endpoint that uses the `{ ok, data }` envelope.
 * Returns `data` on success; throws an {@link ApiError} on failure.
 * On 401 it clears the token and redirects to the login screen.
 */
export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${authToken()}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, { ...init, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    removeAuthToken();
    if (!window.location.pathname.startsWith("/login") && window.location.pathname !== "/") {
      window.location.href = "/";
    }
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // no body
  }

  const payload = json as { ok?: boolean; data?: T; error?: string; message?: string } | null;

  if (!res.ok || (payload && payload.ok === false)) {
    const message =
      payload?.error || payload?.message || `Request failed (${res.status})`;
    throw makeError(message, res.status);
  }

  // Support both enveloped `{ ok, data }` and bare responses.
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
}

export interface Paginated<T> {
  data: T;
  pagination?: { page: number; limit: number; total: number; pages: number };
}

/** Like {@link apiFetch} but also returns pagination metadata. */
export async function apiFetchPaginated<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<Paginated<T>> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${authToken()}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, { ...init, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    removeAuthToken();
    window.location.href = "/";
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // no body
  }

  const payload = json as
    | { ok?: boolean; data?: T; error?: string; pagination?: Paginated<T>["pagination"] }
    | null;

  if (!res.ok || (payload && payload.ok === false)) {
    throw makeError(payload?.error || `Request failed (${res.status})`, res.status);
  }

  return { data: (payload?.data ?? payload) as T, pagination: payload?.pagination };
}
