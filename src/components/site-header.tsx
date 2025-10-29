"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/themes/togel-dark-mode";
import { ThemeSelector } from "@/components/themes/theme-selector";

export function SiteHeader() {
  const pathname = usePathname() || "/";
  const segments = pathname.split("/").filter(Boolean);

  let folder = "Documents";
  const menuIndex = segments.indexOf("menu");
  if (menuIndex !== -1 && segments.length > menuIndex + 1) {
    folder = segments[menuIndex + 1];
  } else if (segments.length > 0) {
    folder = segments[segments.length - 1];
  }

  const title = folder.replace(/[-_]/g, " ").toUpperCase();

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <ThemeSelector />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
