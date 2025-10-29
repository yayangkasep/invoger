"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { ActiveThemeProvider } from "@/components/themes/active-theme";
import SetTitle from "@/components/set-title";
import AuthProvider from "@/components/auth-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ActiveThemeProvider initialTheme={"default"}>
        <SetTitle />
        <AuthProvider>{children}</AuthProvider>
      </ActiveThemeProvider>
    </ThemeProvider>
  );
}
