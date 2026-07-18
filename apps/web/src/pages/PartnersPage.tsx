import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../lib/api.ts";
import { useConfirm } from "../store/useConfirm.ts";
import { useAppStore } from "../store/useAppStore.ts";
import { DataTable } from "../components/shared/data-table.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Pencil, Trash2, Plus, Lock } from "lucide-react";
import { toast } from "sonner";

const partnerFormSchema = z.object({
  name: z.string().min(2, "ชื่อคู่ค้าต้องมีอย่างน้อย 2 ตัวอักษร"),
  partnerTypeId: z.coerce.number().int().min(1).max(4),
  regNo: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export function PartnersPage() {
  const queryClient = useQueryClient();
  const user = useAppStore((state: any) => state.user);
  const isAdmin = user?.roleId === 1;
  const isDataEntry = user?.roleId === 2;
  const canManage = isAdmin || isDataEntry;
  const confirm = useConfirm((state) => state.confirm);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);

  const { data: partnersData, isLoading } = useQuery({
    queryKey: ["partners"],
    queryFn: () => api.get("/stock/partners")
  });

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<z.infer<typeof partnerFormSchema>>({
    resolver: zodResolver(partnerFormSchema),
    defaultValues: { name: "", partnerTypeId: 1, regNo: "", address: "" }
  });

  const watchPartnerTypeId = watch("partnerTypeId");

  React.useEffect(() => {
    if (editingItem) {
      reset({
        name: editingItem.name,
        partnerTypeId: editingItem.partnerTypeId,
        regNo: editingItem.regNo || "",
        address: editingItem.address || ""
      });
    } else {
      reset({ name: "", partnerTypeId: 1, regNo: "", address: "" });
    }
  }, [editingItem, reset]);

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post("/stock/partners", data),
    onSuccess: () => {
      toast.success("เพิ่มข้อมูลคู่ค้าสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    }
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/stock/partners/${id}`, data),
    onSuccess: () => {
      toast.success("แก้ไขข้อมูลคู่ค้าสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      setDialogOpen(false);
      setEditingItem(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/stock/partners/${id}`),
    onSuccess: () => {
      toast.success("ลบข้อมูลคู่ค้าสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["partners"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    }
  });

  const onSubmit = (data: z.infer<typeof partnerFormSchema>) => {
    if (editingItem) {
      editMutation.mutate({ id: editingItem.id, data });
    } else {
      addMutation.mutate(data);
    }
  };

  const columns = [
    { accessorKey: "name", header: "ชื่อคู่ค้า / เกษตรกร / โรงงาน" },
    { accessorKey: "partnerTypeName", header: "ประเภทคู่ค้า" },
    { accessorKey: "regNo", header: "เลขทะเบียนคุม (DOA/GAP)", cell: ({ row }: any) => row.original.regNo || "-" },
    { accessorKey: "address", header: "ที่อยู่/รายละเอียด", cell: ({ row }: any) => <span className="truncate max-w-xs block">{row.original.address || "-"}</span> },
    {
      id: "actions",
      header: "จัดการ",
      cell: ({ row }: any) => {
        if (!canManage) return <span title="ไม่มีสิทธิ์จัดการ"><Lock className="h-4 w-4 opacity-30" /></span>;
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
            <button
              onClick={() => {
                confirm({
                  title: "ยืนยันการลบข้อมูลคู่ค้า",
                  description: `คุณแน่ใจว่าต้องการลบคู่ค้า "${row.original.name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
                  onConfirm: () => deleteMutation.mutate(row.original.id)
                });
              }}
              className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg cursor-pointer transition-colors"
              title="ลบข้อมูล"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">ข้อมูลคู่ค้า / เกษตรกร</h1>
          <p className="text-muted-foreground text-sm">ผู้ขายวัตถุดิบต้นทาง (สวน GAP/โรงงาน DOA) หรือลูกค้าผู้รับซื้อสินค้าปลายทาง</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingItem(null);
          }}>
            <DialogTrigger asChild>
              <Button className="font-semibold cursor-pointer text-xs h-8.5 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                เพิ่มคู่ค้าใหม่
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-5">
              <DialogHeader className="pb-1">
                <DialogTitle className="text-base font-extrabold">
                  {editingItem ? "แก้ไขคู่ค้า" : "เพิ่มคู่ค้าใหม่"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  ลงทะเบียนชื่อและข้อมูล DOA/GAP ของคู่ค้าสำหรับออกรายงานประจำเดือนส่งรัฐ
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-1">
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">ชื่อคู่ค้า / สวน / โรงงาน</Label>
                  <Input 
                    placeholder="เช่น สวนมะพร้าวลุงพงษ์, โรงงานแปรรูปนครปฐม" 
                    {...register("name")}
                    className="h-8 text-xs"
                  />
                  {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">ประเภทคู่ค้า</Label>
                  <Controller
                    name="partnerTypeId"
                    control={control}
                    render={({ field }: { field: any }) => (
                      <Select 
                        onValueChange={(val) => field.onChange(Number(val))} 
                        value={field.value?.toString()}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="เลือกประเภทคู่ค้า" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">โรงงานแปรรูป (มีเลขทะเบียน DOA)</SelectItem>
                          <SelectItem value="2">สวน/เกษตรกร (มีเลขทะเบียน GAP)</SelectItem>
                          <SelectItem value="3">ผู้รวบรวม/ลานเท (Collector)</SelectItem>
                          <SelectItem value="4">บริษัททั่วไป / ลูกค้าปลายทาง</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.partnerTypeId && <span className="text-xs text-destructive">{errors.partnerTypeId.message}</span>}
                </div>
                {(Number(watchPartnerTypeId) === 1 || Number(watchPartnerTypeId) === 2) && (
                  <div className="space-y-0.5">
                    <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">
                      {Number(watchPartnerTypeId) === 1 ? "เลขทะเบียนโรงงาน (DOA Number)" : "เลขทะเบียนสวน (GAP Number)"}
                    </Label>
                    <Input 
                      placeholder="ระบุเลขทะเบียนคุม เช่น DOA 123-456 หรือ GAP 789-012" 
                      {...register("regNo")}
                      className="h-8 text-xs"
                    />
                  </div>
                )}
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">ที่อยู่ / รายละเอียดการติดต่อ</Label>
                  <Textarea 
                    placeholder="ระบุที่อยู่หรือรายละเอียดการติดต่อของคู่ค้า..." 
                    {...register("address")}
                    rows={2}
                    className="text-xs min-h-[44px] p-2"
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
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-12">กำลังดึงข้อมูล...</p>
          ) : partnersData?.data ? (
            <DataTable columns={columns} data={partnersData.data} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">ไม่พบข้อมูลคู่ค้า</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
