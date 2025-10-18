"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

const PUBLIC_PATHS = ["/", "/page", "/api", "/login"]

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  // Lightweight passthrough AuthProvider used during frontend-only development.
  // All auth checks have been removed to keep UI focused on layout and components.
  return <>{children}</>
}
