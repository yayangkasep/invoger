// Small helpers for attaching Authorization: Bearer <token> to fetch requests
// and for use in Next.js API routes or server-side functions.

/**
 * Return an object suitable for fetch headers including Authorization when token provided.
 */
export function getAuthHeaders(token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/**
 * Convenience wrapper for fetch that injects Authorization header if token is given.
 * Keeps the same signature as fetch but accepts token as a first optional arg.
 */
export async function fetchWithAuth(
  input: RequestInfo,
  init: RequestInit = {},
  token?: string,
) {
  const headers = Object.assign(
    {},
    (init.headers as Record<string, string>) || {},
    getAuthHeaders(token),
  );
  const res = await fetch(input, { ...init, headers });
  return res;
}

/**
 * Middleware-style helper for Next.js API routes (req, res) to extract bearer token.
 */
export function extractBearerTokenFromHeader(
  authorizationHeader?: string | null,
) {
  if (!authorizationHeader) return null;
  const m = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export default {
  getAuthHeaders,
  fetchWithAuth,
  extractBearerTokenFromHeader,
};
