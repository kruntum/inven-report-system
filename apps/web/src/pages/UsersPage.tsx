import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../lib/api.ts";
import { useAppStore } from "../store/useAppStore.ts";
import { useConfirm } from "../store/useConfirm.ts";
import { DataTable } from "../components/shared/data-table.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Lock, UserPlus, Building2 } from "lucide-react";
import { toast } from "sonner";
import { userFormSchema } from "../schemas/index.ts";
import { User } from "../types/index.ts";
import { ActionCell } from "../components/shared/ActionCell.tsx";

type UserFormValues = z.infer<typeof userFormSchema>;

export function UsersPage() {
  const queryClient = useQueryClient();
  const user = useAppStore((state) => state.user);
  const isAdmin = user?.roleId === 1;
  const confirm = useConfirm((state) => state.confirm);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<User | null>(null);
  const [selectedCompanyIds, setSelectedCompanyIds] = React.useState<string[]>([]);

  const [companySearchTerm, setCompanySearchTerm] = React.useState("");

  // Fetch all companies for assignment dropdown/checkboxes
  const { data: companiesRes } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["companies-all"],
    queryFn: () => api.get("/companies/all"),
    enabled: !!isAdmin
  });

  const allCompanies = companiesRes?.data || [];

  const filteredCompanies = React.useMemo(() => {
    if (!companySearchTerm.trim()) return allCompanies;
    const term = companySearchTerm.toLowerCase();
    return allCompanies.filter(c => 
      c.name.toLowerCase().includes(term) || (c.taxId && c.taxId.includes(term))
    );
  }, [allCompanies, companySearchTerm]);

  const { data: usersData, isLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["users"],
    queryFn: () => api.get("/auth/users"),
    enabled: !!isAdmin
  });

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { username: "", fullName: "", roleId: 2, password: "" }
  });

  const selectedRoleId = watch("roleId");

  React.useEffect(() => {
    setCompanySearchTerm("");
    if (editingItem) {
      reset({
        username: editingItem.username,
        fullName: editingItem.fullName,
        roleId: editingItem.roleId,
        password: ""
      });
      setSelectedCompanyIds((editingItem as any).companyIds || (editingItem.companyId ? [editingItem.companyId] : []));
    } else {
      reset({ username: "", fullName: "", roleId: 2, password: "" });
      if (allCompanies.length > 0) {
        setSelectedCompanyIds([allCompanies[0].id]);
      } else {
        setSelectedCompanyIds([]);
      }
    }
  }, [editingItem, reset, allCompanies]);

  const toggleCompanySelection = (compId: string) => {
    setSelectedCompanyIds((prev) => 
      prev.includes(compId) ? prev.filter(id => id !== compId) : [...prev, compId]
    );
  };

  const addMutation = useMutation({
    mutationFn: (data: UserFormValues) => 
      api.post("/auth/register", { ...data, companyIds: selectedCompanyIds }),
    onSuccess: () => {
      toast.success("เพิ่มผู้ใช้งานและกำหนดสิทธิ์บริษัทสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึกผู้ใช้");
    }
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserFormValues }) => 
      api.put(`/auth/users/${id}`, { ...data, companyIds: selectedCompanyIds }),
    onSuccess: () => {
      toast.success("แก้ไขข้อมูลผู้ใช้งานสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDialogOpen(false);
      setEditingItem(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/users/${id}`),
    onSuccess: () => {
      toast.success("ลบผู้ใช้สำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    }
  });

  const onSubmit = (data: UserFormValues) => {
    if (selectedRoleId !== 1 && selectedCompanyIds.length === 0) {
      toast.warning("กรุณาเลือกผู้ประกอบการอย่างน้อย 1 บริษัทให้พนักงาน");
      return;
    }

    if (editingItem) {
      editMutation.mutate({ id: editingItem.id, data });
    } else {
      if (!data.password) {
        toast.error("กรุณาระบุรหัสผ่านสำหรับผู้ใช้ใหม่");
        return;
      }
      addMutation.mutate(data);
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <Lock className="h-10 w-10 text-destructive mx-auto mb-3" />
        <h3 className="text-lg font-bold text-destructive">ไม่มีสิทธิ์การเข้าถึงหน้านี้</h3>
        <p className="text-muted-foreground text-xs mt-1">หน้าการจัดการผู้ใช้งานระบบสามารถเข้าถึงได้โดยผู้ดูแลระบบ (Admin) เท่านั้น</p>
      </div>
    );
  }

  const columns = [
    { accessorKey: "username", header: "ชื่อผู้ใช้ (Username)" },
    { accessorKey: "fullName", header: "ชื่อ-นามสกุล" },
    {
      accessorKey: "roleId",
      header: "สิทธิ์การเข้าใช้งาน",
      cell: ({ row }: any) => {
        const roleNames: Record<number, string> = {
          1: "Admin (ผู้ดูแลระบบ)",
          2: "Data Entry (ผู้บันทึกข้อมูล)",
          3: "Gov Officer (เจ้าหน้าที่รัฐ)"
        };
        const roleId = row.original.roleId as number;
        return (
          <Badge variant={roleId === 1 ? "default" : "outline"} className="font-medium text-xs">
            {roleNames[roleId] || "ไม่ระบุ"}
          </Badge>
        );
      }
    },
    {
      id: "companies",
      header: "ผู้ประกอบการที่ดูแล",
      cell: ({ row }: any) => {
        const item = row.original;
        if (item.roleId === 1) {
          return (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> ทุกบริษัทในระบบ (Admin)
            </span>
          );
        }

        const userComps = item.companies || [];
        if (userComps.length === 0) {
          return <span className="text-xs text-muted-foreground">- ไม่ได้กำหนด -</span>;
        }

        return (
          <div className="flex flex-wrap gap-1 items-center">
            {userComps.map((c: any) => (
              <Badge key={c.id} variant="secondary" className="text-[11px] font-normal">
                {c.name}
              </Badge>
            ))}
          </div>
        );
      }
    },
    {
      id: "actions",
      header: "จัดการ",
      cell: ({ row }: any) => {
        const item = row.original as User;
        const isSelf = user?.id === item.id;
        return (
          <ActionCell
            onEdit={() => {
              setEditingItem(item);
              setDialogOpen(true);
            }}
            onDelete={() => {
              confirm({
                title: "ยืนยันการลบผู้ใช้ระบบ",
                description: `คุณแน่ใจว่าต้องการลบผู้ใช้งาน "${item.fullName}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
                onConfirm: () => deleteMutation.mutate(item.id)
              });
            }}
            canDelete={!isSelf}
          />
        );
      }
    }
  ];

  return (
    <Card className="h-[calc(100vh-5.5rem)] flex flex-col border-border/60 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden p-0">
      {/* Top Header */}
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/40 shrink-0 px-6 pt-4">
        <div>
          <CardTitle className="text-2xl font-extrabold tracking-tight">จัดการผู้ใช้งานระบบ</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            จัดการบัญชีพนักงาน ผู้บันทึกข้อมูล และสิทธิ์ดูแลผู้ประกอบการ
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          setCompanySearchTerm("");
          if (!open) setEditingItem(null);
        }}>
          <DialogTrigger asChild>
            <Button className="font-semibold cursor-pointer text-xs h-8.5 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              <UserPlus className="h-3.5 w-3.5" />
              เพิ่มผู้ใช้งาน
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-5 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-1">
              <DialogTitle className="text-base font-extrabold">
                {editingItem ? "แก้ไขข้อมูลผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                กำหนดรหัสเข้าใช้ บทบาท และเลือกผู้ประกอบการ/บริษัทที่อนุญาตให้สิทธิ์เข้าถึง
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 pt-1">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">ชื่อผู้ใช้งาน (Username) *</Label>
                <Input 
                  placeholder="เช่น somchai_data, staff_entry" 
                  {...register("username")}
                  disabled={!!editingItem}
                  className="h-8 text-xs"
                />
                {errors.username && <span className="text-xs text-destructive">{errors.username.message}</span>}
              </div>

              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">ชื่อ-นามสกุลจริง *</Label>
                <Input 
                  placeholder="เช่น สมชาย ยอดมะพร้าว" 
                  {...register("fullName")}
                  className="h-8 text-xs"
                />
                {errors.fullName && <span className="text-xs text-destructive">{errors.fullName.message}</span>}
              </div>

              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">สิทธิ์การเข้าใช้งาน (Role) *</Label>
                <Controller
                  name="roleId"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      onValueChange={(val) => field.onChange(Number(val))} 
                      value={field.value?.toString()}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="เลือกสิทธิ์การใช้งาน" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Admin (ผู้ดูแลระบบ - เข้าถึงได้ทุกบริษัท)</SelectItem>
                        <SelectItem value="2">Data Entry (ผู้บันทึกข้อมูลประจำบริษัท)</SelectItem>
                        <SelectItem value="3">Gov Officer (เจ้าหน้าที่ตรวจสอบ)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.roleId && <span className="text-xs text-destructive">{errors.roleId.message}</span>}
              </div>

              {Number(selectedRoleId) !== 1 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-muted-foreground/90 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                      กำหนดสิทธิ์เข้าถึงบริษัท/ผู้ประกอบการ *
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      เลือกแล้ว {selectedCompanyIds.length} บริษัท
                    </span>
                  </div>

                  <Input
                    placeholder="🔍 ค้นหานิติบุคคล/เลข TAX..."
                    value={companySearchTerm}
                    onChange={(e) => setCompanySearchTerm(e.target.value)}
                    className="h-7 text-xs bg-muted/40 mb-1"
                  />

                  <div className="max-h-[160px] overflow-y-auto border border-border/80 rounded-md p-2 space-y-1.5 bg-card/60">
                    {filteredCompanies.length > 0 ? (
                      filteredCompanies.map((comp) => {
                        const isChecked = selectedCompanyIds.includes(comp.id);
                        return (
                          <div
                            key={comp.id}
                            onClick={() => toggleCompanySelection(comp.id)}
                            className={`flex items-start space-x-2.5 p-1.5 rounded-md cursor-pointer transition-colors ${
                              isChecked ? "bg-emerald-500/10 border border-emerald-500/30" : "hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox 
                              checked={isChecked} 
                              onCheckedChange={() => toggleCompanySelection(comp.id)}
                              className="mt-0.5"
                            />
                            <div className="space-y-0.5 leading-none">
                              <p className="text-xs font-semibold text-foreground">{comp.name}</p>
                              {comp.taxId && (
                                <p className="text-[10px] text-muted-foreground font-mono">TAX: {comp.taxId}</p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-3">ไม่พบผู้ประกอบการที่ค้นหา</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">
                  {editingItem ? "รหัสผ่านใหม่ (ปล่อยว่างหากไม่ต้องการเปลี่ยน)" : "รหัสผ่านสำหรับผู้ใช้ *"}
                </Label>
                <Input 
                  type="password"
                  placeholder={editingItem ? "ระบุรหัสผ่านใหม่" : "ตั้งรหัสผ่านเริ่มต้นสำหรับเข้าใช้"} 
                  {...register("password")}
                  className="h-8 text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={addMutation.isPending || editMutation.isPending}
                className="w-full font-bold h-8.5 text-xs mt-2"
              >
                {addMutation.isPending || editMutation.isPending ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      {/* Main Full-Height Content: DataTable Flex-1 with internal scroll */}
      <CardContent className="flex-1 overflow-hidden p-6 pt-4 flex flex-col min-h-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-12">กำลังดึงข้อมูลผู้ใช้งาน...</p>
        ) : usersData?.data ? (
          <DataTable columns={columns} data={usersData.data} />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">ไม่พบข้อมูลผู้ใช้งาน</p>
        )}
      </CardContent>
    </Card>
  );
}

export default UsersPage;
