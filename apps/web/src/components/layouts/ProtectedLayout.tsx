import * as React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb.tsx";
import { AppSidebar } from "@/components/app-sidebar.tsx";

// Lazy-load page views with named-to-default mapper
const DashboardPage = React.lazy(() => import("../../pages/DashboardPage.tsx").then(m => ({ default: m.DashboardPage })));
const StockEntryPage = React.lazy(() => import("../../pages/StockEntryPage.tsx").then(m => ({ default: m.StockEntryPage })));
const MonthlyReportsPage = React.lazy(() => import("../../pages/MonthlyReportsPage.tsx").then(m => ({ default: m.MonthlyReportsPage })));
const ProductsPage = React.lazy(() => import("../../pages/ProductsPage.tsx").then(m => ({ default: m.ProductsPage })));
const StoragePage = React.lazy(() => import("../../pages/StoragePage.tsx").then(m => ({ default: m.StoragePage })));
const PartnersPage = React.lazy(() => import("../../pages/PartnersPage.tsx").then(m => ({ default: m.PartnersPage })));
const UsersPage = React.lazy(() => import("../../pages/UsersPage.tsx").then(m => ({ default: m.UsersPage })));
const CompanySettingsPage = React.lazy(() => import("../../pages/CompanySettingsPage.tsx").then(m => ({ default: m.CompanySettingsPage })));
const CompanyManagementPage = React.lazy(() => import("../../pages/CompanyManagementPage.tsx").then(m => ({ default: m.CompanyManagementPage })));
const UserManualPage = React.lazy(() => import("../../pages/UserManualPage.tsx").then(m => ({ default: m.UserManualPage })));

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
    "/settings": "ตั้งค่าผู้ประกอบการปัจจุบัน",
    "/settings/companies": "จัดการผู้ประกอบการทั้งหมด",
    "/manual": "คู่มือการใช้งานระบบ",
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
          <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">กำลังโหลดหน้าเพจ...</span>
            </div>
          }>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/stock" element={<StockEntryPage />} />
              <Route path="/reports" element={<MonthlyReportsPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/storage" element={<StoragePage />} />
              <Route path="/partners" element={<PartnersPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/settings" element={<CompanySettingsPage />} />
              <Route path="/settings/companies" element={<CompanyManagementPage />} />
              <Route path="/manual" element={<UserManualPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
