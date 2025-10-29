import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { fontVariables, META_THEME_COLORS } from "@/lib/fonts";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { ActiveThemeProvider } from "@/components/themes/active-theme";
import { cn } from "@/lib/utils";
import SetTitle from "@/components/set-title";
import Providers from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "INVOGER",
  description: "Fast and flexible generator invoicing software.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // check cookie first (set by ActiveThemeProvider), then localStorage, then system
                function getCookie(name){
                  var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
                  return match ? decodeURIComponent(match[2]) : null
                }
                // Read palette (invoger_theme) and color-scheme (next-themes -> localStorage.theme) separately
                var palette = getCookie('invoger_theme') || (localStorage.getItem && localStorage.getItem('invoger_theme'))
                var colorScheme = (localStorage.getItem && localStorage.getItem('theme')) || null
                // Apply palette theme early so CSS variables match user's selected palette
                try {
                  if (palette) {
                    document.documentElement.classList.add('theme-' + palette)
                    document.body.classList.add('theme-' + palette)
                    if (String(palette).endsWith('-scaled')) {
                      document.documentElement.classList.add('theme-scaled')
                      document.body.classList.add('theme-scaled')
                    }
                  }

                  // Determine dark mode from next-themes (localStorage.theme) or from palette name if it encodes dark
                  var isDark = false
                  if (colorScheme === 'dark') isDark = true
                  if (!isDark && palette && String(palette).indexOf('dark') !== -1) isDark = true

                  if (isDark) {
                    document.documentElement.classList.add('dark')
                    document.body.classList.add('dark')
                    document.querySelector('meta[name="theme-color"]').setAttribute('content', '${META_THEME_COLORS.dark}')
                  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    // fallback to system preference when no explicit choice
                    document.documentElement.classList.add('dark')
                    document.body.classList.add('dark')
                    document.querySelector('meta[name="theme-color"]').setAttribute('content', '${META_THEME_COLORS.dark}')
                  }
                } catch(_) {}
                if (localStorage.layout) {
                  document.documentElement.classList.add('layout-' + localStorage.layout)
                }
                // Set page title to INVOGER | <folder>
                try {
                  var segments = location.pathname.split('/').filter(Boolean)
                  var folderName = ''
                  if (segments.length) {
                    folderName = (segments[0] === 'menu' && segments[1]) ? segments[1] : segments[0]
                  }
                  if (folderName) {
                    // Preserve original casing from the path and replace hyphens with spaces for readability
                    var pretty = decodeURIComponent(folderName).replace(/-/g, ' ')
                    document.title = 'INVOGER | ' + pretty
                  } else {
                    document.title = 'INVOGER'
                  }
                } catch (_) {}
              } catch (_) {}
            `,
          }}
        />
        <meta name="theme-color" content={META_THEME_COLORS.light} />
      </head>
      <body
        className={cn(
          "bg-background text-foreground group/body overscroll-none font-sans antialiased [--footer-height:calc(var(--spacing)*14)] [--header-height:calc(var(--spacing)*14)] xl:[--footer-height:calc(var(--spacing)*24)]",
          fontVariables,
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
