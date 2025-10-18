// Server-side Firebase Admin SDK initializer and helpers.
// This module initializes the Firebase Admin app using either the
// GOOGLE_APPLICATION_CREDENTIALS environment variable (preferred),
// or a JSON service account provided via FIREBASE_SERVICE_ACCOUNT (stringified JSON).

import admin from 'firebase-admin'

// If an app is already initialized (hot reload in development), reuse it.
if (!admin.apps.length) {
	try {
		if (process.env.FIREBASE_SERVICE_ACCOUNT) {
			// Expected to be a JSON string of the service account
			const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
			// serviceAccount should match Firebase service account shape
			admin.initializeApp({ credential: admin.credential.cert(serviceAccount as Record<string, unknown>) })
		} else {
			// Will use GOOGLE_APPLICATION_CREDENTIALS if present in the environment
			admin.initializeApp()
		}
	} catch (err) {
		// If initialization fails, rethrow with a helpful message in dev.
		// In production ensure credentials are configured correctly.
		// We don't console.error here to avoid leaking secrets in some environments.
		throw err
	}
}

/**
 * Verify an ID token issued by Firebase Auth.
 * Wraps admin.auth().verifyIdToken and returns the decoded token payload.
 */
export async function verifyIdToken(idToken: string) {
	if (!idToken) throw new Error('idToken is required')
	return admin.auth().verifyIdToken(idToken)
}

export default admin
