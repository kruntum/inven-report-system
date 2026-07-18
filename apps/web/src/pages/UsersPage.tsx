import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../lib/api.ts";
import { useAppStore } from "../store/useAppStore.ts";
import { useConfirm } from "../store/useConfirm.ts";
import { DataTable } from "../components/shared/data-table.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Pencil, Trash2, Lock, UserPlus } from "lucide-react";
import { toast } from "sonner";

const userFormSchema = z.object({
  username: z.string().min(3, "Username ต้องมีอย่างน้อย 3 ตัวอักษร"),
  fullName: z.string().min(2, "ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร"),
  roleId: z.coerce.number().int().min(1).max(3),
  password: z.string().optional().or(z.literal("")),
});

export function UsersPage() {
  const queryClient = useQueryClient();
  const user = useAppStore((state) => state.user);
  const isAdmin = user?.roleId === 1;
  const confirm = useConfirm((state) => state.confirm);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/auth/users"),
    enabled: !!isAdmin
  });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { username: "", fullName: "", roleId: 2, password: "" }
  });

  React.useEffect(() => {
    if (editingItem) {
      reset({
        username: editingItem.username,
        fullName: editingItem.fullName,
        roleId: editingItem.roleId,
        password: ""
      });
    } else {
      reset({ username: "", fullName: "", roleId: 2, password: "" });
    }
  }, [editingItem, reset]);

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post("/auth/register", { ...data, companyId: user?.companyId }),
    onSuccess: () => {
      toast.success("เพิ่มผู้ใช้ระบบสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    }
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/auth/users/${id}`, data),
    onSuccess: () => {
      toast.success("แก้ไขข้อมูลผู้ใช้งานสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDialogOpen(false);
      setEditingItem(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาด");
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

  const onSubmit = (data: z.infer<typeof userFormSchema>) => {
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
        return roleNames[row.original.roleId] || "ไม่ระบุ";
      }
    },
    {
      id: "actions",
      header: "จัดการ",
      cell: ({ row }: any) => {
        const isSelf = user?.id === row.original.id;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingItem(row.original);
                setDialogOpen(true);
              }}
              className="text-primary hover:bg-primary/10 p-1.5 rounded-lg cursor-pointer transition-colors"
              title="แก้ไขข้อมูล"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {!isSelf && (
              <button
                onClick={() => {
                  confirm({
                    title: "ยืนยันการลบผู้ใช้ระบบ",
                    description: `คุณแน่ใจว่าต้องการลบผู้ใช้งาน "${row.original.fullName}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
                    onConfirm: () => deleteMutation.mutate(row.original.id)
                  });
                }}
                className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg cursor-pointer transition-colors"
                title="ลบข้อมูล"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">จัดการผู้ใช้งานระบบ</h1>
          <p className="text-muted-foreground text-sm">จัดการบัญชีพนักงาน ผู้บันทึกข้อมูล และสิทธิ์การเข้าใช้งานระบบคุมสินค้า</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingItem(null);
        }}>
          <DialogTrigger asChild>
            <Button className="font-semibold cursor-pointer text-xs h-8.5 gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              เพิ่มผู้ใช้งาน
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] p-5">
            <DialogHeader className="pb-1">
              <DialogTitle className="text-base font-extrabold">
                {editingItem ? "แก้ไขข้อมูลผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                สร้างหรือแก้ไขสิทธิ์ผู้เข้าบันทึกข้อมูลภายในบริษัทคุมสินค้า
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-1">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">ชื่อผู้ใช้งาน (Username)</Label>
                <Input 
                  placeholder="เช่น somchai_data, staff_entry" 
                  {...register("username")}
                  disabled={!!editingItem}
                  className="h-8 text-xs"
                />
                {errors.username && <span className="text-xs text-destructive">{errors.username.message}</span>}
              </div>
              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">ชื่อ-นามสกุลจริง</Label>
                <Input 
                  placeholder="เช่น สมชาย ยอดมะพร้าว" 
                  {...register("fullName")}
                  className="h-8 text-xs"
                />
                {errors.fullName && <span className="text-xs text-destructive">{errors.fullName.message}</span>}
              </div>
              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">สิทธิ์การเข้าใช้งาน (Role)</Label>
                <Controller
                  name="roleId"
                  control={control}
                  render={({ field }: { field: any }) => (
                    <Select 
                      onValueChange={(val) => field.onChange(Number(val))} 
                      value={field.value?.toString()}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="เลือกสิทธิ์การใช้งาน" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Admin (ผู้ดูแลระบบ)</SelectItem>
                        <SelectItem value="2">Data Entry (ผู้บันทึกข้อมูล)</SelectItem>
                        <SelectItem value="3">Gov Officer (เจ้าหน้าที่ตรวจสอบ)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.roleId && <span className="text-xs text-destructive">{errors.roleId.message}</span>}
              </div>
              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">
                  {editingItem ? "รหัสผ่านใหม่ (ปล่อยว่างหากไม่ต้องการเปลี่ยน)" : "รหัสผ่านสำหรับผู้ใช้"}
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
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-12">กำลังดึงข้อมูล...</p>
          ) : usersData?.data ? (
            <DataTable columns={columns} data={usersData.data} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">ไม่พบข้อมูลผู้ใช้งาน</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
