// Server-side Firebase Admin SDK initializer and helpers.
// This module initializes the Firebase Admin app using either the
// GOOGLE_APPLICATION_CREDENTIALS environment variable (preferred),
// or a JSON service account provided via FIREBASE_SERVICE_ACCOUNT (stringified JSON).

import admin from "firebase-admin";

// If an app is already initialized (hot reload in development), reuse it.
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Expected to be a JSON string of the service account
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      // serviceAccount should match Firebase service account shape
      admin.initializeApp({
        credential: admin.credential.cert(
          serviceAccount as Record<string, unknown>,
        ),
      });
    } else {
      // Will use GOOGLE_APPLICATION_CREDENTIALS if present in the environment
      admin.initializeApp();
    }
  } catch (err) {
    // If initialization fails, rethrow with a helpful message in dev.
    // In production ensure credentials are configured correctly.
    // We don't console.error here to avoid leaking secrets in some environments.
    throw err;
  }
}

/**
 * Verify an ID token issued by Firebase Auth.
 * Wraps admin.auth().verifyIdToken and returns the decoded token payload.
 */
export async function verifyIdToken(idToken: string) {
  if (!idToken) throw new Error("idToken is required");
  // Try Admin SDK verify if available/configured
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    // If Admin SDK not initialized or verification fails (no service account),
    // fall back to Firebase REST API accounts:lookup which can validate token
    // without admin SDK (it checks that the token maps to a user).
    const FIREBASE_API_KEY =
      process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!FIREBASE_API_KEY) throw err;
    try {
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("verifyIdToken REST lookup failed");
      const data = await res.json().catch(() => ({}));
      const user = data && data.users && data.users[0];
      if (!user) throw new Error("Invalid token (no user)");
      // return a normalized object similar to admin.auth().verifyIdToken
      return { uid: user.localId, email: user.email, raw: user };
    } catch (e) {
      throw err;
    }
  }
}

export default admin;
