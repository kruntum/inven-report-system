import * as React from "react";
import { ChevronsUpDown, Plus, Building2, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.ts";
import { useAppStore } from "../store/useAppStore.ts";
import { useThaiAddress } from "../hooks/useThaiAddress.ts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";

export interface Company {
  id: string;
  name: string;
  taxId: string;
  houseNo?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  zipcode?: string;
}

export function TeamSwitcher() {
  const { isMobile } = useSidebar();
  const queryClient = useQueryClient();
  const user = useAppStore((state) => state.user);
  const activeCompanyId = useAppStore((state) => state.activeCompanyId);
  const setActiveCompanyId = useAppStore((state) => state.setActiveCompanyId);
  const isAdmin = user?.roleId === 1;

  const [addDialogOpen, setAddDialogOpen] = React.useState(false);

  // Address Selector for New Company Modal
  const addressSelector = useThaiAddress();

  // Form State for new company
  const [newCompanyData, setNewCompanyData] = React.useState({
    name: "",
    taxId: "",
    houseNo: "",
    phone: "",
    email: "",
    authorizedPerson: "",
    authorizedPosition: "",
  });

  // Fetch Companies
  // Admin gets all active companies, non-admin gets user's allowed companies
  const { data: companiesRes } = useQuery<{ success: boolean; data: Company[] }>({
    queryKey: ["companies-list", isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        const res = await api.get("/companies/all");
        return { success: true, data: Array.isArray(res.data) ? res.data : [] };
      }
      const meRes = await api.get("/auth/me");
      return { success: true, data: Array.isArray(meRes.user?.companies) ? meRes.user.companies : [] };
    },
  });

  const { data: myCompanyRes } = useQuery<{ success: boolean; data: Company }>({
    queryKey: ["company-my"],
    queryFn: () => api.get("/companies/my"),
  });

  const myCompany = myCompanyRes?.data;

  const [switcherSearch, setSwitcherSearch] = React.useState("");

  const rawData = companiesRes?.data;
  const companyList: Company[] = Array.isArray(rawData) ? rawData : [];

  const filteredCompanyList = React.useMemo(() => {
    if (!switcherSearch.trim()) return companyList;
    const term = switcherSearch.toLowerCase();
    return companyList.filter(c => 
      c.name.toLowerCase().includes(term) || (c.taxId && c.taxId.includes(term))
    );
  }, [companyList, switcherSearch]);

  // Active Company Object
  const activeCompany = companyList.find((c) => c.id === activeCompanyId) || companyList[0] || myCompany;

  // Initialize active company if not set
  React.useEffect(() => {
    if (companyList.length > 0 && (!activeCompanyId || !companyList.some(c => c.id === activeCompanyId))) {
      setActiveCompanyId(companyList[0].id);
    } else if (!activeCompanyId && myCompany?.id) {
      setActiveCompanyId(myCompany.id);
    }
  }, [companyList, activeCompanyId, setActiveCompanyId, myCompany]);

  const handleSwitchCompany = (company: Company) => {
    setActiveCompanyId(company.id);
    toast.success(`สลับไปยังผู้ประกอบการ: ${company.name}`);
    queryClient.invalidateQueries();
  };

  // Add Company Mutation
  const createCompanyMutation = useMutation({
    mutationFn: (payload: any) => api.post("/companies", payload),
    onSuccess: (res) => {
      toast.success("ลงทะเบียนผู้ประกอบการใหม่สำเร็จ");
      queryClient.invalidateQueries();
      if (res.data?.id) {
        setActiveCompanyId(res.data.id);
      }
      setAddDialogOpen(false);
      setNewCompanyData({
        name: "",
        taxId: "",
        houseNo: "",
        phone: "",
        email: "",
        authorizedPerson: "",
        authorizedPosition: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการลงทะเบียนบริษัท");
    }
  });

  const handleCreateCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyData.name || !newCompanyData.taxId) {
      toast.error("กรุณากรอกชื่อบริษัทและเลขประจำตัวผู้เสียภาษี 13 หลัก");
      return;
    }
    if (newCompanyData.taxId.length !== 13) {
      toast.error("เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก");
      return;
    }

    const { province, district, subDistrict, zipcode } = addressSelector.getSelectedNames();

    createCompanyMutation.mutate({
      ...newCompanyData,
      province,
      district,
      subDistrict,
      zipcode,
    });
  };

  if (!activeCompany) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="p-2 text-xs text-muted-foreground animate-pulse">กำลังโหลดผู้ประกอบการ...</div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {activeCompany.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    TAX: {activeCompany.taxId}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-80 sm:w-96 rounded-xl p-2 shadow-xl border border-border max-h-[85vh] overflow-y-auto"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={6}
            >
              <div className="p-1 pb-2">
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-1 pb-1.5">
                  เลือกผู้ประกอบการ / บริษัท ({filteredCompanyList.length})
                </DropdownMenuLabel>
                {companyList.length > 3 && (
                  <Input
                    placeholder="🔍 ค้นหาชื่อบริษัท หรือ เลข TAX ID..."
                    value={switcherSearch}
                    onChange={(e) => setSwitcherSearch(e.target.value)}
                    className="h-7.5 text-xs bg-muted/40"
                  />
                )}
              </div>
              <DropdownMenuSeparator className="my-1" />
              {(filteredCompanyList || []).length > 0 ? (
                filteredCompanyList.map((comp) => {
                  const isSelected = comp.id === activeCompany.id;
                  return (
                    <DropdownMenuItem
                      key={comp.id}
                      onClick={() => handleSwitchCompany(comp)}
                      className="gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="flex size-7 items-center justify-center rounded-md border bg-background shrink-0 mt-0.5">
                        <Building2 className="size-4 shrink-0 text-primary" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-xs font-semibold text-foreground leading-tight whitespace-normal break-words">{comp.name}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">TAX: {comp.taxId}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-emerald-600 shrink-0 ml-auto" />}
                    </DropdownMenuItem>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">ไม่พบผู้ประกอบการที่ค้นหา</p>
              )}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setAddDialogOpen(true)}
                    className="gap-2 p-2 cursor-pointer text-primary font-medium"
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border bg-primary/10 text-primary">
                      <Plus className="size-4" />
                    </div>
                    <div className="text-xs">ลงทะเบียนผู้ประกอบการใหม่</div>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Add New Company Dialog for Admin */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">ลงทะเบียนผู้ประกอบการใหม่</DialogTitle>
            <DialogDescription className="text-xs">
              เพิ่มข้อมูลบริษัท/ผู้ประกอบการใหม่เข้าสู่ระบบ เพื่อจัดทำและนำส่งรายงาน สพภ.01/02
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCompanySubmit} className="space-y-3.5 text-xs mt-2">
            <div className="space-y-0.5">
              <Label className="text-[11px] font-bold text-muted-foreground/90 mb-1 block">ชื่อบริษัท / ผู้ประกอบการ *</Label>
              <Input
                placeholder="เช่น บริษัท มะพร้าวไทยรุ่งเรือง จำกัด"
                value={newCompanyData.name}
                onChange={(e) => setNewCompanyData({ ...newCompanyData, name: e.target.value })}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-1 block">เลขประจำตัวผู้เสียภาษี (13 หลัก) *</Label>
                <Input
                  placeholder="0105550000000"
                  maxLength={13}
                  value={newCompanyData.taxId}
                  onChange={(e) => setNewCompanyData({ ...newCompanyData, taxId: e.target.value })}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-1 block">บ้านเลขที่ / หมู่</Label>
                <Input
                  placeholder="เช่น 123/45 หมู่ 2"
                  value={newCompanyData.houseNo}
                  onChange={(e) => setNewCompanyData({ ...newCompanyData, houseNo: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Cascading Thai Address Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-1 block">จังหวัด</Label>
                <Select value={addressSelector.provinceId} onValueChange={addressSelector.handleProvinceChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="เลือกจังหวัด" />
                  </SelectTrigger>
                  <SelectContent>
                    {(addressSelector.provinces || []).map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name_th}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-1 block">อำเภอ/เขต</Label>
                <Select
                  value={addressSelector.districtId}
                  onValueChange={addressSelector.handleDistrictChange}
                  disabled={!addressSelector.provinceId}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="เลือกอำเภอ" />
                  </SelectTrigger>
                  <SelectContent>
                    {(addressSelector.districts || []).map((a) => (
                      <SelectItem key={a.id} value={a.id.toString()}>{a.name_th}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-1 block">ตำบล/แขวง</Label>
                <Select
                  value={addressSelector.subDistrictId}
                  onValueChange={addressSelector.handleSubDistrictChange}
                  disabled={!addressSelector.districtId}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="เลือกตำบล" />
                  </SelectTrigger>
                  <SelectContent>
                    {(addressSelector.subDistricts || []).map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.name_th}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-1 block">รหัสไปรษณีย์</Label>
                <Input value={addressSelector.zipcode} readOnly placeholder="อัตโนมัติ" className="bg-muted h-8 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-1 block">เบอร์โทรศัพท์</Label>
                <Input
                  placeholder="081-234-5678"
                  value={newCompanyData.phone}
                  onChange={(e) => setNewCompanyData({ ...newCompanyData, phone: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-1 block">ผู้มีอำนาจลงนาม (สภก.02)</Label>
                <Input
                  placeholder="เช่น นายสมชาย ใจดี"
                  value={newCompanyData.authorizedPerson}
                  onChange={(e) => setNewCompanyData({ ...newCompanyData, authorizedPerson: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" type="button" onClick={() => setAddDialogOpen(false)} className="h-8.5 text-xs">
                ยกเลิก
              </Button>
              <Button type="submit" disabled={createCompanyMutation.isPending} className="h-8.5 text-xs font-bold">
                {createCompanyMutation.isPending ? "กำลังบันทึก..." : "บันทึกและสลับไปใช้งาน"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TeamSwitcher;
