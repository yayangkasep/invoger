'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { setToken as setClientToken } from '@/lib/auth/client';
import { AUTH_TOKEN_KEY } from '@/lib/auth/constants';

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params?.get('next') || '/menu/Dashboard';

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [apiError, setApiError] = React.useState<{
    code?: string;
    message: string;
  } | null>(null);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setApiError(null);
    try {
      if (!email || !password) {
        toast.error('Email and password are required');
        setLoading(false);
        return;
      }
      // Call server-side login route which sets an HttpOnly cookie on success.
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const payload: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Try to extract structured information from Firebase / API error responses
        let serverCode = String(res.status);
        let serverMessage: string | undefined;

        if (payload && typeof payload === 'object') {
          const p = payload as Record<string, unknown>;
          serverCode = String((p.error as Record<string, unknown>)?.code ?? p.code ?? res.status);
          serverMessage = ((p.error as Record<string, unknown>)?.message as string | undefined) || (p.message as string | undefined) || (typeof p.error === 'string' ? p.error : undefined);

          // If serverMessage is a string that contains JSON (because upstream code stringified it), try to extract JSON
          if (typeof serverMessage === 'string') {
            const text = serverMessage as string;
            const jsonStart = text.indexOf('{');
            if (jsonStart !== -1) {
              try {
                const parsed = JSON.parse(text.slice(jsonStart));
                serverCode = String(parsed?.error?.code ?? parsed?.code ?? serverCode);
                serverMessage = parsed?.error?.message || parsed?.message || (Array.isArray(parsed?.errors) && parsed.errors[0]?.message) || text;
              } catch (e) {
                // ignore parse errors
              }
            }
            // If still looks long, try to regex-extract an ALL_CAPS token like INVALID_LOGIN_CREDENTIALS
            if (!serverMessage || (typeof serverMessage === 'string' && serverMessage.length > 100)) {
              const m = text.match(/"message"\s*:\s*"([A-Z0-9_]+)"/) || text.match(/([A-Z_]{5,})/);
              if (m) serverMessage = m[1];
            }
          }
        } else if (typeof payload === 'string') {
          // payload may be a string that contains JSON at the end. Try to parse JSON substring.
          const payloadText = payload as string;
          const jsonStart = payloadText.indexOf('{');
          if (jsonStart !== -1) {
            try {
              const parsed = JSON.parse(payloadText.slice(jsonStart)) as Record<string, unknown>;
              serverCode = String((parsed.error as Record<string, unknown>)?.code ?? parsed.code ?? res.status);
              // Extract a usable message from common shapes: parsed.error.message | parsed.message | parsed.errors[0].message
              const maybeError = parsed.error as Record<string, unknown> | undefined;
              const maybeErrors = Array.isArray(parsed.errors) ? (parsed.errors as unknown[]) : undefined;
              const parsedMessage = (maybeError && typeof maybeError.message === 'string' && maybeError.message) || (typeof parsed.message === 'string' && parsed.message) || (maybeErrors && maybeErrors.length > 0 && typeof (maybeErrors[0] as Record<string, unknown>).message === 'string' && ((maybeErrors[0] as Record<string, unknown>).message as string)) || undefined;
              serverMessage = parsedMessage;
            } catch (e) {
              // fall back to raw text
            }
          }
          // If still not found, try to pick a short token-like substring from the string (e.g., INVALID_LOGIN_CREDENTIALS)
          if (!serverMessage) {
            const m = payloadText.match(/"message"\s*:\s*"([A-Z0-9_]+)"/) || payloadText.match(/([A-Z_]{5,})/);
            serverMessage = m ? m[1] : payloadText;
          }
        }

        const message = String(serverMessage ?? 'Login failed');
        // show both toast and inline alert
        toast.error(message);
        setApiError({ code: serverCode, message });
        setLoading(false);
        return;
      }

      // Server set HttpOnly cookie; also store token in localStorage for client-side APIs
      // and set a non-HttpOnly cookie for convenience (optional).
      const p = payload as Record<string, unknown>;
      const idToken = typeof p?.idToken === 'string' ? p.idToken : undefined;
      if (idToken) {
        try {
          setClientToken(idToken);
          // set a non-HttpOnly cookie (expires in seconds) so client-side code can read if needed
          const maxAge = p?.expiresIn ? Number(p.expiresIn as unknown) : undefined;
          const expires = maxAge ? `;max-age=${maxAge}` : '';
          document.cookie = `${AUTH_TOKEN_KEY}=${idToken};path=/;SameSite=Lax${expires}`;
        } catch (e) {
          // ignore storage errors
        }
      }

      toast.success('Login successful');
      setApiError(null);
      router.push(next);
    } catch (err: unknown) {
      console.error('Firebase auth error:', err);
      const code = err && typeof err === 'object' && 'code' in err && typeof (err as { code?: unknown }).code === 'string' ? (err as { code: string }).code : 'unknown';
      // Map some common Firebase auth error codes to friendly Indonesian messages
      function getFirebaseErrorMessage(code?: string) {
        switch (code) {
          case 'auth/invalid-email':
            return 'Invalid email format.';
          case 'auth/user-disabled':
            return 'Your account has been disabled.';
          case 'auth/user-not-found':
            return 'Account not found. Please sign up first.';
          case 'auth/wrong-password':
            return 'Incorrect password.';
          case 'auth/invalid-credential':
            return 'Invalid credential. Check Firebase configuration.';
          case 'auth/network-request-failed':
            return 'Network request failed. Check your connection.';
          default:
            return undefined;
        }
      }

      const extractedMessage = err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string' ? (err as { message: string }).message : undefined;
      const message = getFirebaseErrorMessage(code) || extractedMessage || 'Login failed';
      toast.error(`${message} (${code})`);
      setApiError({ code, message: String(message) });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    // Google login disabled in frontend-only mode; show toast for UI testing.
    toast.info('Google login disabled in frontend-only mode');
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>INVOGER</CardTitle>
          <CardDescription>Enter your email below to login your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  {/* <a href="#" className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                    Forgot your password?
                  </a> */}
                </div>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Loading...' : 'Login'}
                </Button>
                {/* <Button variant="outline" className="w-full" type="button" onClick={handleGoogleLogin} disabled={loading}>
                  {loading ? "Loading..." : "Login with Google"}
                </Button> */}
                {/* Inline destructive alert showing API/server error */}
                {apiError && (
                  <div className="mt-2">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <div>
                        <AlertTitle>ERROR!</AlertTitle>
                        <AlertDescription>
                          <p>
                            {apiError?.code ?? ''} {apiError?.message}
                          </p>
                          <ul className="mt-1 list-disc list-inside text-sm">
                            <li>Please check your email.</li>
                            <li>And your password.</li>
                          </ul>
                        </AlertDescription>
                      </div>
                    </Alert>
                  </div>
                )}
              </div>
            </div>
            {/* <div className="mt-4 text-center text-sm">
              Don&apos;t have an account? <a href="#" className="underline underline-offset-4">Sign up</a>
            </div> */}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
