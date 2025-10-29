"use client";

import * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  IconDashboard,
  IconFileInvoice,
  IconMapPin,
  IconPrinter,
  IconTag,
  IconInnerShadowTop,
  IconReport,
  IconSpeakerphone,
} from "@tabler/icons-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "DASHBOARD",
      url: "/menu/Dashboard",
      icon: IconDashboard,
    },
    {
      title: "INVOICE",
      url: "/menu/Invoice",
      icon: IconFileInvoice,
    },
    {
      title: "OUTLET",
      url: "/menu/Outlet",
      icon: IconMapPin,
    },
    {
      title: "PRINT",
      url: "/menu/Print",
      icon: IconPrinter,
    },
    {
      title: "PRODUCTS",
      url: "/menu/Products",
      icon: IconTag,
    },
    {
      title: "PROMOTIONS",
      url: "/menu/Promotions",
      icon: IconSpeakerphone,
    },
    {
      title: "REPORTS",
      url: "/menu/Reports",
      icon: IconReport,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">INVOGER.</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
