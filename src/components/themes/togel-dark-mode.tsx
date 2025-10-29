"use client";

import * as React from "react";
import { Icon, Moon, Sun, LaptopMinimal } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconSun, IconMoon, IconDeviceLaptop } from "@tabler/icons-react";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const mode = theme ?? "system";
  const isLight = mode === "light";
  const isDark = mode === "dark";
  const isSystem = mode === "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun
            className={
              "h-[1.2rem] w-[1.2rem] transition-all " +
              (isLight ? "scale-100 rotate-0" : "scale-0 -rotate-90")
            }
          />
          <Moon
            className={
              "absolute h-[1.2rem] w-[1.2rem] transition-all " +
              (isDark ? "scale-100 rotate-0" : "scale-0 rotate-90")
            }
          />
          <LaptopMinimal
            className={
              "absolute h-[1.2rem] w-[1.2rem] transition-all " +
              (isSystem ? "scale-100 rotate-0" : "scale-0 rotate-90")
            }
          />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <IconSun className="mr-2 h-4 w-4" />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <IconMoon className="mr-2 h-4 w-4" />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <IconDeviceLaptop className="mr-2 h-4 w-4" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
