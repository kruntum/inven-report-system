import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "../lib/api.ts"
import { StorageLocation } from "../types/index.ts"
import {
  BookOpen,
  ClipboardList,
  Settings2,
  Warehouse,
} from "lucide-react"

import { NavMain } from "@/components/nav-main.tsx"
import { NavProjects } from "@/components/nav-projects.tsx"
import { NavUser } from "@/components/nav-user.tsx"
import { TeamSwitcher } from "@/components/team-switcher.tsx"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar.tsx"

const staticNavMain = [
  {
    title: "บัญชีคุมสินค้า",
    url: "/",
    icon: ClipboardList,
    isActive: true,
    items: [
      { title: "แดชบอร์ดสรุปยอด", url: "/" },
      { title: "บันทึกรายการประจำวัน", url: "/stock" },
      { title: "ส่งรายงานราชการรายเดือน", url: "/reports" },
    ],
  },
  {
    title: "จัดการข้อมูล",
    url: "#",
    icon: Settings2,
    items: [
      { title: "ข้อมูลสินค้าควบคุม", url: "/products" },
      { title: "ข้อมูลคลังสินค้า", url: "/storage" },
      { title: "ข้อมูลคู่ค้า/เกษตรกร", url: "/partners" },
      { title: "ผู้ใช้งานระบบ", url: "/users" },
      { title: "ตั้งค่าผู้ประกอบการ", url: "/settings/companies" },
      { title: "ตั้งค่าบริษัทปัจจุบัน", url: "/settings" },
    ],
  },
  {
    title: "คู่มือการใช้งาน",
    url: "/manual",
    icon: BookOpen,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  const { data: storageRes } = useQuery<{ success: boolean; data: StorageLocation[] }>({
    queryKey: ["storage-locations"],
    queryFn: () => api.get("/storage"),
  });

  const storageLocations = storageRes?.data || [];


  const projects = React.useMemo(() => {
    // Filter out the virtual direct delivery warehouse to prevent clutter
    const filtered = storageLocations.filter(
      (loc) => loc.name !== "ส่งมอบโดยตรง (ไม่ผ่านคลัง)"
    );
    return filtered.map((loc) => ({
      name: loc.name,
      url: "/storage",
      icon: Warehouse,
    }));
  }, [storageLocations]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={staticNavMain} />
        {projects.length > 0 && <NavProjects projects={projects} />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
export default AppSidebar;
