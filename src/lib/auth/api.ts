// Client/server API helpers for authentication and example data fetches.
// Uses Firebase Authentication REST API to sign in with email/password
// and provides example functions to call protected endpoints with
// Authorization: Bearer <idToken> header.

// NOTE: make sure to set NEXT_PUBLIC_FIREBASE_API_KEY (for client) or
// FIREBASE_API_KEY (for server) in your environment.

const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!FIREBASE_API_KEY) {
  // It's okay to run without API key during static analysis, but log a warning.
  // In production, ensure FIREBASE_API_KEY is provided.
  // console.warn('FIREBASE_API_KEY is not set; Firebase Auth REST calls will fail')
}

type LoginResponse = {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email?: string;
};

/**
 * Sign in with email and password using Firebase Auth REST API.
 * Returns the idToken (JWT) that can be used for Authorization header.
 */
export async function loginWithEmailPassword(
  email: string,
  password: string,
): Promise<LoginResponse> {
  if (!FIREBASE_API_KEY) throw new Error("FIREBASE_API_KEY not configured");

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  if (!res.ok) {
    // avoid dumping full payload (may contain sensitive info)
    const text = await res.text().catch(() => "");
    const short = text.length > 300 ? text.slice(0, 300) + "…" : text;
    throw new Error(
      `Firebase login failed: ${res.status} ${res.statusText} ${short}`,
    );
  }

  const data = await res.json();
  // data contains idToken, refreshToken, expiresIn, localId, email
  return data as LoginResponse;
}

/**
 * Example helper to call a protected API route for products.
 * Pass in the idToken (from loginWithEmailPassword) and it will
 * include Authorization: Bearer <token> header.
 */
export async function getProducts(apiUrl = "/api/products", idToken?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

  // If caller relies on server-side HttpOnly cookie for auth, include credentials so cookie is sent.
  const res = await fetch(apiUrl, {
    headers,
    credentials: idToken ? undefined : "same-origin",
  });
  if (!res.ok)
    throw new Error(`getProducts failed: ${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * Example helper to call a protected API route for outlets.
 */
export async function getOutlets(apiUrl = "/api/outlets", idToken?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

  const res = await fetch(apiUrl, {
    headers,
    credentials: idToken ? undefined : "same-origin",
  });
  if (!res.ok)
    throw new Error(`getOutlets failed: ${res.status} ${res.statusText}`);
  return res.json();
}

// Export default convenience object
export default {
  loginWithEmailPassword,
  getProducts,
  getOutlets,
};
