"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function SetTitle() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const segments = (pathname || "").split("/").filter(Boolean);
      let folderName = "";
      if (segments.length) {
        folderName =
          segments[0] === "menu" && segments[1] ? segments[1] : segments[0];
      }

      const desired = folderName
        ? "INVOGER | " + decodeURIComponent(folderName).replace(/-/g, " ")
        : "INVOGER";

      // apply title immediately and re-apply shortly after to avoid hydration races
      document.title = desired;
      const t = setTimeout(() => {
        document.title = desired;
      }, 50);

      // Reapply persisted palette theme (cookie or localStorage.invoger_theme) on navigation to prevent palette reversion
      try {
        function getCookie(name: string) {
          const match = document.cookie.match(
            new RegExp("(^| )" + name + "=([^;]+)"),
          );
          return match ? decodeURIComponent(match[2]) : null;
        }

        const persisted =
          getCookie("invoger_theme") ||
          (localStorage.getItem("invoger_theme") as string | null);
        // Prefer next-themes stored value (localStorage.theme) for light/dark mode decision.
        const nextTheme =
          (localStorage.getItem && localStorage.getItem("theme")) || null;

        try {
          const html = document.documentElement;
          const body = document.body;
          if (persisted) {
            // replace theme-* classes but don't force remove/add of .dark here
            Array.from(html.classList)
              .filter((c) => c.startsWith("theme-"))
              .forEach((c) => html.classList.remove(c));
            Array.from(body.classList)
              .filter((c) => c.startsWith("theme-"))
              .forEach((c) => body.classList.remove(c));

            html.classList.add("theme-" + persisted);
            body.classList.add("theme-" + persisted);
          }

          // If next-themes has an explicit stored preference, honor it.
          if (nextTheme === "dark") {
            html.classList.add("dark");
            body.classList.add("dark");
          } else if (nextTheme === "light") {
            html.classList.remove("dark");
            body.classList.remove("dark");
          } else if (persisted && String(persisted).indexOf("dark") !== -1) {
            // Fallback: derive dark from palette name only when next-themes has no explicit preference
            html.classList.add("dark");
            body.classList.add("dark");
          }
        } catch (_) {}
      } catch (_) {}

      // Observe changes to the title element and restore if overwritten
      const titleEl = document.querySelector("head > title");
      let observer: MutationObserver | null = null;
      if (titleEl) {
        observer = new MutationObserver(() => {
          if (document.title !== desired) {
            document.title = desired;
          }
        });

        observer.observe(titleEl, {
          characterData: true,
          childList: true,
          subtree: true,
        });
      }

      return () => {
        clearTimeout(t);
        if (observer) observer.disconnect();
      };
    } catch (_) {
      // ignore
    }
  }, [pathname]);

  return null;
}
