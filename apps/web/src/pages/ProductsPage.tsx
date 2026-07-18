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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Pencil, Trash2, Plus, Lock } from "lucide-react";
import { toast } from "sonner";

const productFormSchema = z.object({
  name: z.string().min(2, "ชื่อสินค้าต้องมีอย่างน้อย 2 ตัวอักษร"),
  baseUnitId: z.coerce.number().int().min(1).max(5),
});

export function ProductsPage() {
  const queryClient = useQueryClient();
  const user = useAppStore((state: any) => state.user);
  const isAdmin = user?.roleId === 1;
  const confirm = useConfirm((state) => state.confirm);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get("/products")
  });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { name: "", baseUnitId: 1 }
  });

  React.useEffect(() => {
    if (editingItem) {
      reset({
        name: editingItem.name,
        baseUnitId: editingItem.baseUnitId
      });
    } else {
      reset({ name: "", baseUnitId: 1 });
    }
  }, [editingItem, reset]);

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post("/products", data),
    onSuccess: () => {
      toast.success("เพิ่มสินค้าควบคุมสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    }
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/products/${id}`, data),
    onSuccess: () => {
      toast.success("แก้ไขข้อมูลสินค้าสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
      setEditingItem(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      toast.success("ลบสินค้าสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    }
  });

  const onSubmit = (data: z.infer<typeof productFormSchema>) => {
    if (editingItem) {
      editMutation.mutate({ id: editingItem.id, data });
    } else {
      addMutation.mutate(data);
    }
  };

  const columns = [
    { accessorKey: "name", header: "ชื่อสินค้าควบคุม" },
    { accessorKey: "baseUnitName", header: "หน่วยนับหลัก" },
    {
      id: "actions",
      header: "จัดการ",
      cell: ({ row }: any) => {
        if (!isAdmin) return <span title="ต้องเป็นผู้ดูแลระบบ"><Lock className="h-4 w-4 opacity-30" /></span>;
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
                  title: "ยืนยันการลบสินค้าควบคุม",
                  description: `คุณแน่ใจว่าต้องการลบสินค้า "${row.original.name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
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
          <h1 className="text-3xl font-extrabold tracking-tight">ข้อมูลสินค้าควบคุม</h1>
          <p className="text-muted-foreground text-sm">รายการสินค้าควบคุมที่ขึ้นทะเบียนบัญชีตามประกาศของคณะกรรมการกลางฯ</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingItem(null);
          }}>
            <DialogTrigger asChild>
              <Button className="font-semibold cursor-pointer text-xs h-8.5 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                เพิ่มสินค้าควบคุม
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] p-5">
              <DialogHeader className="pb-1">
                <DialogTitle className="text-base font-extrabold">
                  {editingItem ? "แก้ไขสินค้าควบคุม" : "เพิ่มสินค้าควบคุม"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  กรอกชื่อสินค้าและเลือกหน่วยนับเพื่อใช้บันทึกสต๊อกในระบบ
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-1">
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">ชื่อสินค้า</Label>
                  <Input 
                    placeholder="เช่น มะพร้าวผลอ่อน, น้ำมะพร้าวสด" 
                    {...register("name")}
                    className="h-8 text-xs"
                  />
                  {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">หน่วยนับหลัก</Label>
                  <Controller
                    name="baseUnitId"
                    control={control}
                    render={({ field }: { field: any }) => (
                      <Select 
                        onValueChange={(val) => field.onChange(Number(val))} 
                        value={field.value?.toString()}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="เลือกหน่วยนับหลัก" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">ลูก</SelectItem>
                          <SelectItem value="2">ตัน</SelectItem>
                          <SelectItem value="3">กิโลกรัม</SelectItem>
                          <SelectItem value="4">ลิตร</SelectItem>
                          <SelectItem value="5">กล่อง</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.baseUnitId && <span className="text-xs text-destructive">{errors.baseUnitId.message}</span>}
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
          ) : productsData?.data ? (
            <DataTable columns={columns} data={productsData.data} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">ไม่พบข้อมูลสินค้าคุม</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
