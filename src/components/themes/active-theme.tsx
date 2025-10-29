"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

const DEFAULT_THEME = "default";

type ThemeContextType = {
  activeTheme: string;
  setActiveTheme: (theme: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ActiveThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme?: string;
}) {
  // helper for cookies
  function getCookie(name: string) {
    if (typeof document === "undefined") return undefined;
    const match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)"),
    );
    return match ? decodeURIComponent(match[2]) : undefined;
  }

  function setCookie(name: string, value: string, days = 365) {
    if (typeof document === "undefined") return;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; Expires=${expires}; Path=/; SameSite=Lax`;
  }

  // initialize from cookie -> localStorage -> initialTheme -> default
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        const cookie = getCookie("invoger_theme");
        if (cookie) return cookie;
        const ls = localStorage.getItem("invoger_theme");
        if (ls) return ls;
      }
    } catch (_) {}
    return initialTheme || DEFAULT_THEME;
  });

  // apply theme class and mirror to cookie/localStorage
  useEffect(() => {
    Array.from(document.body.classList)
      .filter((className) => className.startsWith("theme-"))
      .forEach((className) => {
        document.body.classList.remove(className);
      });
    // Apply theme class to body and html for robustness against other libraries
    document.body.classList.add(`theme-${activeTheme}`);
    try {
      document.documentElement.classList.remove(
        ...Array.from(document.documentElement.classList).filter((c) =>
          c.startsWith("theme-"),
        ),
      );
    } catch (_) {}
    document.documentElement.classList.add(`theme-${activeTheme}`);
    if (activeTheme.endsWith("-scaled")) {
      document.body.classList.add("theme-scaled");
    } else {
      document.body.classList.remove("theme-scaled");
    }

    try {
      // persist to cookie and localStorage.invoger_theme only if they differ to avoid races
      const currentLs = localStorage.getItem("invoger_theme");
      if (currentLs !== activeTheme) {
        setCookie("invoger_theme", activeTheme);
        localStorage.setItem("invoger_theme", activeTheme);
      } else {
        // ensure cookie exists as mirror
        setCookie("invoger_theme", activeTheme);
      }
    } catch (_) {
      // ignore
    }
  }, [activeTheme]);

  // Keep in sync with other controls that write to localStorage.invoger_theme
  useEffect(() => {
    try {
      // on mount, if localStorage.invoger_theme differs, adopt it
      const ls =
        typeof window !== "undefined"
          ? localStorage.getItem("invoger_theme")
          : null;
      if (ls && ls !== activeTheme) {
        setActiveTheme(ls);
      }

      const handleStorage = (e: StorageEvent) => {
        if (e.key === "invoger_theme") {
          try {
            const newVal = e.newValue;
            if (newVal && newVal !== activeTheme) {
              setActiveTheme(newVal);
            }
          } catch (_) {}
        }
      };

      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    } catch (_) {
      // ignore
    }
  }, [activeTheme, setActiveTheme]);

  return (
    <ThemeContext.Provider value={{ activeTheme, setActiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeConfig() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error(
      "useThemeConfig must be used within an ActiveThemeProvider",
    );
  }
  return context;
}
