// Client-side authentication helpers.
// NOTE: filename intentionally matches existing project file `cilent.ts`.
// Provides small helpers for signing in via the Firebase REST helper in api.ts,
// storing the idToken in localStorage, and calling protected endpoints.

import api from './api'
import { getAuthHeaders } from './jwt'

const TOKEN_KEY = 'invoger_token'

/**
 * Sign in using email/password via the Firebase REST wrapper in api.ts.
 * Stores idToken in localStorage on success and returns the full login response.
 */
export async function signIn(email: string, password: string) {
	// delegate to api.loginWithEmailPassword
	const res = await api.loginWithEmailPassword(email, password)
	if (res?.idToken) setToken(res.idToken)
	return res
}

/**
 * Store token in localStorage (client only).
 */
export function setToken(token: string) {
	try {
		if (typeof window === 'undefined') return
		localStorage.setItem(TOKEN_KEY, token)
	} catch (err) {
		// ignore storage errors
	}
}

/**
 * Retrieve token from localStorage (client only).
 */
export function getToken(): string | null {
	try {
		if (typeof window === 'undefined') return null
		return localStorage.getItem(TOKEN_KEY)
	} catch (err) {
		return null
	}
}

/**
 * Remove token from storage (sign out).
 */
export function clearAuth() {
	try {
		if (typeof window === 'undefined') return
		localStorage.removeItem(TOKEN_KEY)
	} catch (err) {
		// ignore
	}
}

/**
 * Simple boolean if user appears authenticated (has token).
 */
export function isAuthenticated() {
	return !!getToken()
}

/**
 * Fetch wrapper for client-side requests that injects Authorization header
 * using the stored token (if available) or an optional token param.
 */
export async function fetchWithAuthClient(input: RequestInfo, init: RequestInit = {}, token?: string) {
	const t = token ?? getToken() ?? undefined
	const headers = Object.assign({}, (init.headers as Record<string, string>) || {}, getAuthHeaders(t))
	return fetch(input, { ...init, headers })
}

export default {
	signIn,
	setToken,
	getToken,
	clearAuth,
	isAuthenticated,
	fetchWithAuthClient,
}
