import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Pencil, Trash2, Plus, Lock } from "lucide-react";
import { toast } from "sonner";

const storageFormSchema = z.object({
  name: z.string().min(2, "ชื่อสถานที่เก็บต้องมีอย่างน้อย 2 ตัวอักษร"),
  address: z.string().min(5, "ที่อยู่สถานที่เก็บต้องมีอย่างน้อย 5 ตัวอักษร"),
});

export function StoragePage() {
  const queryClient = useQueryClient();
  const user = useAppStore((state: any) => state.user);
  const isAdmin = user?.roleId === 1;
  const isDataEntry = user?.roleId === 2;
  const canManage = isAdmin || isDataEntry;
  const confirm = useConfirm((state) => state.confirm);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);

  const { data: storageData, isLoading } = useQuery({
    queryKey: ["storage-locations"],
    queryFn: () => api.get("/storage")
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof storageFormSchema>>({
    resolver: zodResolver(storageFormSchema),
    defaultValues: { name: "", address: "" }
  });

  React.useEffect(() => {
    if (editingItem) {
      reset({
        name: editingItem.name,
        address: editingItem.address
      });
    } else {
      reset({ name: "", address: "" });
    }
  }, [editingItem, reset]);

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post("/storage", data),
    onSuccess: () => {
      toast.success("เพิ่มสถานที่เก็บสินค้าสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    }
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/storage/${id}`, data),
    onSuccess: () => {
      toast.success("แก้ไขข้อมูลสถานที่เก็บสินค้าสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
      setDialogOpen(false);
      setEditingItem(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/storage/${id}`),
    onSuccess: () => {
      toast.success("ลบสถานที่เก็บสินค้าสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    }
  });

  const onSubmit = (data: z.infer<typeof storageFormSchema>) => {
    if (editingItem) {
      editMutation.mutate({ id: editingItem.id, data });
    } else {
      addMutation.mutate(data);
    }
  };

  const columns = [
    { accessorKey: "name", header: "ชื่อคลัง / สถานที่เก็บ" },
    { accessorKey: "address", header: "ที่ตั้งคลังสินค้า", cell: ({ row }: any) => <span className="truncate max-w-sm block">{row.original.address}</span> },
    {
      id: "actions",
      header: "จัดการ",
      cell: ({ row }: any) => {
        if (row.original.name === "ส่งมอบโดยตรง (ไม่ผ่านคลัง)") {
          return <span className="text-[10px] text-muted-foreground bg-muted p-1 rounded">คลังเสมือนถาวร</span>;
        }
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
                  title: "ยืนยันการลบคลังสินค้า",
                  description: `คุณแน่ใจว่าต้องการลบคลังสินค้า "${row.original.name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
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
          <h1 className="text-3xl font-extrabold tracking-tight">ข้อมูลสถานที่เก็บ / คลังสินค้า</h1>
          <p className="text-muted-foreground text-sm">สถานที่เก็บครอบครองสินค้าควบคุมตามที่ขึ้นทะเบียนไว้กับกรมการค้าภายใน</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingItem(null);
          }}>
            <DialogTrigger asChild>
              <Button className="font-semibold cursor-pointer text-xs h-8.5 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                เพิ่มคลังสินค้า
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] p-5">
              <DialogHeader className="pb-1">
                <DialogTitle className="text-base font-extrabold">
                  {editingItem ? "แก้ไขคลังสินค้า" : "เพิ่มคลังสินค้า"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  กรอกชื่อคลังและสถานที่ตั้งคลังสินค้า
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-1">
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">ชื่อคลังสินค้า</Label>
                  <Input 
                    placeholder="เช่น โกดัง C, ถังเก็บน้ำมันพืช" 
                    {...register("name")}
                    className="h-8 text-xs"
                  />
                  {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">ที่ตั้ง / ที่อยู่คลังสินค้า</Label>
                  <Textarea 
                    placeholder="ระบุที่อยู่อย่างละเอียดของสถานที่เก็บ..." 
                    {...register("address")}
                    rows={3}
                    className="text-xs min-h-[60px] p-2"
                  />
                  {errors.address && <span className="text-xs text-destructive">{errors.address.message}</span>}
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
          ) : storageData?.data ? (
            <DataTable columns={columns} data={storageData.data} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">ไม่พบข้อมูลคลังสินค้า</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
