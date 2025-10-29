"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AUTH_TOKEN_KEY } from "@/lib/auth/constants";
import { Spinner } from "@/components/ui/spinner";

const PUBLIC_PATHS = ["/", "/page", "/api", "/login"];

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [verifying, setVerifying] = React.useState(false);

  React.useEffect(() => {
    if (!pathname) return;

    let mounted = true;

    // If user navigates to root/login pages, verify token and redirect authenticated users to dashboard
    if (pathname === "/" || pathname === "/page" || pathname === "/login") {
      setVerifying(true);
      const ctrl = new AbortController();
      (async () => {
        try {
          const res = await fetch("/api/auth/verify", { signal: ctrl.signal });
          if (!mounted) return;
          if (res.status === 200) {
            router.replace("/menu/Dashboard");
            return;
          }
          // not authorized -> allow login to render
        } catch (_) {
          // network error: allow login to render
        } finally {
          if (mounted) setVerifying(false);
        }
      })();

      return () => {
        mounted = false;
        ctrl.abort();
      };
    }

    // Only verify when navigating into protected area (/menu/*)
    if (!pathname.startsWith("/menu")) return;

    setVerifying(true);
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/auth/verify", { signal: ctrl.signal });
        if (!mounted) return;
        if (res.status === 200) {
          // authorized — allow render
          return;
        }
        // Not authorized -> clear cookie (best-effort) and redirect to login
        try {
          document.cookie = `${AUTH_TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
        } catch (_) {}
        router.replace("/");
      } catch (_) {
        // network or other error: conservatively redirect to login
        router.replace("/");
      } finally {
        if (mounted) setVerifying(false);
      }
    })();

    return () => {
      mounted = false;
      ctrl.abort();
    };
  }, [pathname, router]);

  // While verifying, show a global centered spinner to indicate loading/auth check
  if (verifying)
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Spinner variant="bars" size={36} />
      </div>
    );

  return <>{children}</>;
}
