import * as React from "react"
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

const data = {
  teams: [
    { name: "มะพร้าวไทยรุ่งเรือง", logo: Warehouse, plan: "ผู้ประกอบการ" },
  ],
  navMain: [
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
        { title: "ตั้งค่าผู้ประกอบการ", url: "/settings" },
      ],
    },
    {
      title: "คู่มือการใช้งาน",
      url: "#",
      icon: BookOpen,
      items: [
        { title: "ระเบียบ สกกร.", url: "#" },
        { title: "คู่มือผู้ใช้", url: "#" },
      ],
    },
  ],
  projects: [
    { name: "โกดังสินค้า A", url: "/storage", icon: Warehouse },
    { name: "โกดังสินค้า B", url: "/storage", icon: Warehouse },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
