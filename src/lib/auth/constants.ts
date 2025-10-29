// Centralized auth-related constants
// Use a single consistent key for cookie/localStorage across client and server.
export const AUTH_TOKEN_KEY = "invoger_token";

// default token expiry in seconds (string form to match Firebase REST 'expiresIn')
// can be overridden via environment variable NEXT_PUBLIC_AUTH_EXPIRES_IN or AUTH_EXPIRES_IN
export const AUTH_EXPIRES_IN =
  process.env.AUTH_EXPIRES_IN ??
  process.env.NEXT_PUBLIC_AUTH_EXPIRES_IN ??
  "604800"; // 7 days
// When true, prefer the configured AUTH_EXPIRES_IN over provider/res.expiresIn
export const AUTH_FORCE_EXPIRES_IN =
  (process.env.AUTH_FORCE_EXPIRES_IN || "false").toLowerCase() === "true";
