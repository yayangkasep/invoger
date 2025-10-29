// Client-side authentication helpers.
// NOTE: filename intentionally matches existing project file `cilent.ts`.
// Provides small helpers for signing in via the Firebase REST helper in api.ts,
// storing the idToken in localStorage, and calling protected endpoints.

import api from "./api";
import { getAuthHeaders } from "./jwt";
import { AUTH_TOKEN_KEY } from "./constants";

const TOKEN_KEY = AUTH_TOKEN_KEY;
const LEGACY_KEY = "invoger_id_token";

// Migration: if legacy key exists in localStorage but new key doesn't,
// migrate the value and remove the legacy key to avoid duplicates.
try {
  if (typeof window !== "undefined" && window.localStorage) {
    const hasNew = localStorage.getItem(TOKEN_KEY);
    const hasLegacy = localStorage.getItem(LEGACY_KEY);
    if (!hasNew && hasLegacy) {
      localStorage.setItem(TOKEN_KEY, hasLegacy);
      localStorage.removeItem(LEGACY_KEY);
    }
  }
} catch (err) {
  // ignore storage errors during migration
}

/**
 * Sign in using email/password via the Firebase REST wrapper in api.ts.
 * Stores idToken in localStorage on success and returns the full login response.
 */
export async function signIn(email: string, password: string) {
  // Call server login route which sets HttpOnly cookie and returns idToken in body
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "same-origin",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Login failed: ${res.status} ${res.statusText} ${text}`);
  }

  const data = await res.json().catch(() => ({}));
  if (data?.idToken) setToken(data.idToken);
  return data;
}

/**
 * Store token in localStorage (client only).
 */
export function setToken(token: string) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
    // remove any legacy key to keep storage consistent
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch (_) {}
  } catch (err) {
    // ignore storage errors
  }
}

/**
 * Retrieve token from localStorage (client only).
 */
export function getToken(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  } catch (err) {
    return null;
  }
}

/**
 * Remove token from storage (sign out).
 */
export function clearAuth() {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch (_) {}
  } catch (err) {
    // ignore
  }
}

/**
 * Simple boolean if user appears authenticated (has token).
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Fetch wrapper for client-side requests that injects Authorization header
 * using the stored token (if available) or an optional token param.
 */
export async function fetchWithAuthClient(
  input: RequestInfo,
  init: RequestInit = {},
  token?: string,
) {
  const t = token ?? getToken() ?? undefined;
  const headers = Object.assign(
    {},
    (init.headers as Record<string, string>) || {},
    getAuthHeaders(t),
  );
  // include credentials by default so HttpOnly cookie auth works
  const opts = {
    ...init,
    headers,
    credentials: (init?.credentials as any) ?? "same-origin",
  };
  return fetch(input, opts);
}

export default {
  signIn,
  setToken,
  getToken,
  clearAuth,
  isAuthenticated,
  fetchWithAuthClient,
};
