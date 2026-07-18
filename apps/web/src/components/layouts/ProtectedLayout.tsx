import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb.tsx";
import { AppSidebar } from "@/components/app-sidebar.tsx";

// Import page views relatively from src/pages
import { DashboardPage } from "../../pages/DashboardPage.tsx";
import { StockEntryPage } from "../../pages/StockEntryPage.tsx";
import { MonthlyReportsPage } from "../../pages/MonthlyReportsPage.tsx";
import { ProductsPage } from "../../pages/ProductsPage.tsx";
import { StoragePage } from "../../pages/StoragePage.tsx";
import { PartnersPage } from "../../pages/PartnersPage.tsx";
import { UsersPage } from "../../pages/UsersPage.tsx";
import { CompanySettingsPage } from "../../pages/CompanySettingsPage.tsx";

export function ProtectedLayout() {
  const location = useLocation();

  const pageTitles: Record<string, string> = {
    "/": "แดชบอร์ดสรุปยอด",
    "/stock": "บันทึกรายการประจำวัน",
    "/reports": "ส่งรายงานราชการรายเดือน",
    "/products": "ข้อมูลสินค้าควบคุม",
    "/storage": "ข้อมูลคลังสินค้า",
    "/partners": "ข้อมูลคู่ค้า/เกษตรกร",
    "/users": "ผู้ใช้งานระบบ",
    "/settings": "ตั้งค่าผู้ประกอบการ",
  };

  const currentPageTitle = pageTitles[location.pathname] || "หน้าหลัก";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">
                    บัญชีคุมสินค้า
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentPageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/stock" element={<StockEntryPage />} />
            <Route path="/reports" element={<MonthlyReportsPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/storage" element={<StoragePage />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/settings" element={<CompanySettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
