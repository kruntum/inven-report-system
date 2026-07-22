import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.ts";
import { useAppStore } from "../store/useAppStore.ts";
import { useConfirm } from "../store/useConfirm.ts";
import { useThaiAddress } from "../hooks/useThaiAddress.ts";
import { DataTable } from "../components/shared/data-table.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Plus, Lock, Edit3, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Company } from "../types/index.ts";

export function CompanyManagementPage() {
  const queryClient = useQueryClient();
  const user = useAppStore((state) => state.user);
  const activeCompanyId = useAppStore((state) => state.activeCompanyId);
  const setActiveCompanyId = useAppStore((state) => state.setActiveCompanyId);
  const isAdmin = user?.roleId === 1;
  const confirm = useConfirm((state) => state.confirm);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCompany, setEditingCompany] = React.useState<Company | null>(null);

  // Address Selector Hook for Thai Provinces
  const addressSelector = useThaiAddress();

  // Form State
  const [formData, setFormData] = React.useState({
    name: "",
    taxId: "",
    houseNo: "",
    phone: "",
    email: "",
    authorizedPerson: "",
    authorizedPosition: "",
  });

  // Fetch all companies including soft-deleted ones for Admin
  const { data: companiesRes, isLoading } = useQuery<{ success: boolean; data: Company[] }>({
    queryKey: ["companies-management"],
    queryFn: () => api.get("/companies/all?includeDeleted=true"),
    enabled: !!isAdmin,
  });

  const companiesList = companiesRes?.data || [];

  // Reset or Populate form on modal toggle
  React.useEffect(() => {
    if (editingCompany) {
      setFormData({
        name: editingCompany.name || "",
        taxId: editingCompany.taxId || "",
        houseNo: editingCompany.houseNo || "",
        phone: editingCompany.phone || "",
        email: editingCompany.email || "",
        authorizedPerson: editingCompany.authorizedPerson || "",
        authorizedPosition: editingCompany.authorizedPosition || "",
      });
      if (editingCompany.province) {
        addressSelector.initializeAddress(
          editingCompany.province,
          editingCompany.district,
          editingCompany.subDistrict
        );
      }
    } else {
      setFormData({
        name: "",
        taxId: "",
        houseNo: "",
        phone: "",
        email: "",
        authorizedPerson: "",
        authorizedPosition: "",
      });
      addressSelector.resetAddress();
    }
  }, [editingCompany]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post("/companies", payload),
    onSuccess: (res) => {
      toast.success("ลงทะเบียนผู้ประกอบการใหม่สำเร็จ");
      queryClient.invalidateQueries();
      setDialogOpen(false);
      if (res.data?.id) {
        setActiveCompanyId(res.data.id);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการสร้างบริษัท");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.put(`/companies/${id}`, payload),
    onSuccess: () => {
      toast.success("อัปเดตข้อมูลผู้ประกอบการสำเร็จ");
      queryClient.invalidateQueries();
      setDialogOpen(false);
      setEditingCompany(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/companies/${id}`),
    onSuccess: (res: any) => {
      toast.success(res.message || "ปิดใช้งานผู้ประกอบการสำเร็จ");
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการปิดใช้งาน");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/companies/${id}/restore`),
    onSuccess: (res: any) => {
      toast.success(res.message || "เปิดใช้งานผู้ประกอบการอีกครั้งสำเร็จ");
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการเปิดใช้งาน");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.taxId) {
      toast.error("กรุณากรอกชื่อบริษัทและเลขประจำตัวผู้เสียภาษี 13 หลัก");
      return;
    }
    if (formData.taxId.length !== 13) {
      toast.error("เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก");
      return;
    }

    const { province, district, subDistrict, zipcode } = addressSelector.getSelectedNames();

    const payload = {
      ...formData,
      province,
      district,
      subDistrict,
      zipcode,
    };

    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <Lock className="h-10 w-10 text-destructive mx-auto mb-3" />
        <h3 className="text-lg font-bold text-destructive">ไม่มีสิทธิ์การเข้าถึงหน้านี้</h3>
        <p className="text-muted-foreground text-xs mt-1">หน้าการจัดการผู้ประกอบการสามารถเข้าถึงได้โดยผู้ดูแลระบบ (Admin) เท่านั้น</p>
      </div>
    );
  }

  const columns = [
    {
      accessorKey: "name",
      header: "ชื่อผู้ประกอบการ / บริษัท",
      cell: ({ row }: any) => {
        const item = row.original as Company;
        const isCurrentActive = activeCompanyId === item.id;

        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span>{item.name}</span>
              {isCurrentActive && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-600">
                  กำลังใช้งาน
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">TAX: {item.taxId}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "address",
      header: "ที่อยู่สถานประกอบการ",
      cell: ({ row }: any) => {
        const item = row.original as Company;
        return (
          <span className="text-xs text-muted-foreground line-clamp-2">
            {item.address || `${item.houseNo || ''} ต.${item.subDistrict || ''} อ.${item.district || ''} จ.${item.province || ''}`}
          </span>
        );
      },
    },
    {
      accessorKey: "authorizedPerson",
      header: "ผู้มีอำนาจลงนาม / ติดต่อ",
      cell: ({ row }: any) => {
        const item = row.original as Company;
        return (
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-foreground">{item.authorizedPerson || "-"}</p>
            <p className="text-[11px] text-muted-foreground">{item.phone || "-"}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "deletedAt",
      header: "สถานะระบบ",
      cell: ({ row }: any) => {
        const item = row.original as Company;
        const isDeleted = !!item.deletedAt;

        return (
          <Badge variant={isDeleted ? "secondary" : "outline"} className={isDeleted ? "text-amber-600 bg-amber-500/10 border-amber-500/30 text-xs" : "text-emerald-600 border-emerald-500/30 bg-emerald-500/10 text-xs"}>
            {isDeleted ? "ปิดใช้งานแล้ว" : "ใช้งานปกติ"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "จัดการ",
      cell: ({ row }: any) => {
        const item = row.original as Company;
        const isDeleted = !!item.deletedAt;

        return (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingCompany(item);
                setDialogOpen(true);
              }}
              className="h-7 text-xs px-2 cursor-pointer gap-1"
            >
              <Edit3 className="h-3 w-3" /> แก้ไข
            </Button>

            {isDeleted ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  confirm({
                    title: "ยืนยันการเปิดใช้งานผู้ประกอบการอีกครั้ง",
                    description: `คุณต้องการเปิดใช้งาน "${item.name}" กลับเข้าสู่ระบบอีกครั้งใช่หรือไม่?`,
                    onConfirm: () => restoreMutation.mutate(item.id),
                  });
                }}
                className="h-7 text-xs px-2 cursor-pointer gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              >
                <RotateCcw className="h-3 w-3" /> เปิดใช้งาน
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  confirm({
                    title: "ยืนยันการปิดใช้งานผู้ประกอบการ",
                    description: `คุณต้องการปิดใช้งาน "${item.name}" ใช่หรือไม่? บริษัทนี้จะไม่ถูกซ่อนออกจากดรอปดาวน์และสิทธิ์ของพนักงาน`,
                    onConfirm: () => deleteMutation.mutate(item.id),
                  });
                }}
                className="h-7 text-xs px-2 cursor-pointer gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <Trash2 className="h-3 w-3" /> ปิดใช้งาน
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Card className="h-[calc(100vh-5.5rem)] flex flex-col border-border/60 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden p-0">
      {/* Top Header */}
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/40 shrink-0 px-6 pt-4">
        <div>
          <CardTitle className="text-2xl font-extrabold tracking-tight">ตั้งค่าผู้ประกอบการ</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            จัดการข้อมูลบริษัท เลขประจำตัวผู้เสียภาษี และสถานะการใช้งานผู้ประกอบการ
          </CardDescription>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingCompany(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="font-semibold cursor-pointer text-xs h-8.5 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-3.5 w-3.5" />
              เพิ่มผู้ประกอบการใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] p-5 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-1">
              <DialogTitle className="text-base font-extrabold">
                {editingCompany ? "แก้ไขข้อมูลผู้ประกอบการ" : "ลงทะเบียนผู้ประกอบการใหม่"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                กรอกข้อมูลบริษัท/ผู้ประกอบการเพื่อใช้ในการจัดทำและนำส่งรายงาน สพภ.01/02
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs mt-2">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-1 block">ชื่อบริษัท / ผู้ประกอบการ *</Label>
                <Input
                  placeholder="เช่น บริษัท มะพร้าวไทยรุ่งเรือง จำกัด"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="h-8 text-xs"
                    required
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90 mb-1 block">บ้านเลขที่ / หมู่</Label>
                  <Input
                    placeholder="เช่น 123/45 หมู่ 2"
                    value={formData.houseNo}
                    onChange={(e) => setFormData({ ...formData, houseNo: e.target.value })}
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
                    <SelectTrigger className="h-8 text-xs cursor-pointer">
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
                    <SelectTrigger className="h-8 text-xs cursor-pointer">
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
                  <Input value={addressSelector.zipcode} readOnly placeholder="อัตโนมัติ" className="bg-muted h-8 text-xs font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90 mb-1 block">เบอร์โทรศัพท์</Label>
                  <Input
                    placeholder="081-234-5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90 mb-1 block">ผู้มีอำนาจลงนาม (สภก.02)</Label>
                  <Input
                    placeholder="เช่น นายสมชาย ใจดี"
                    value={formData.authorizedPerson}
                    onChange={(e) => setFormData({ ...formData, authorizedPerson: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" type="button" onClick={() => setDialogOpen(false)} className="h-8.5 text-xs">
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="h-8.5 text-xs font-bold">
                  {createMutation.isPending || updateMutation.isPending ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      {/* Main Full-Height Content: DataTable Flex-1 with internal scroll */}
      <CardContent className="flex-1 overflow-hidden p-6 pt-4 flex flex-col min-h-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-12">กำลังดึงข้อมูลผู้ประกอบการ...</p>
        ) : companiesList.length > 0 ? (
          <DataTable columns={columns} data={companiesList} />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">ไม่พบข้อมูลผู้ประกอบการในระบบ</p>
        )}
      </CardContent>
    </Card>
  );
}

export default CompanyManagementPage;
