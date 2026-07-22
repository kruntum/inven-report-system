import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../lib/api.ts";
import { useConfirm } from "../store/useConfirm.ts";
import { useAppStore } from "../store/useAppStore.ts";
import { DataTable } from "../components/shared/data-table.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Plus, Lock } from "lucide-react";
import { storageFormSchema } from "../schemas/index.ts";
import { StorageLocation } from "../types/index.ts";
import { useCrudMutations } from "../hooks/useCrudMutations.ts";
import { ActionCell } from "../components/shared/ActionCell.tsx";

type StorageFormValues = z.infer<typeof storageFormSchema>;

export function StoragePage() {
  const user = useAppStore((state) => state.user);
  const isAdmin = user?.roleId === 1;
  const isDataEntry = user?.roleId === 2;
  const canManage = isAdmin || isDataEntry;
  const confirm = useConfirm((state) => state.confirm);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<StorageLocation | null>(null);

  const { data: storageData, isLoading } = useQuery<{ success: boolean; data: StorageLocation[] }>({
    queryKey: ["storage-locations"],
    queryFn: () => api.get("/storage")
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StorageFormValues>({
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

  const { addMutation, editMutation, deleteMutation } = useCrudMutations<StorageFormValues>(
    "/storage",
    ["storage-locations"],
    () => {
      setDialogOpen(false);
      setEditingItem(null);
    },
    {
      add: "เพิ่มสถานที่เก็บสินค้าสำเร็จ",
      edit: "แก้ไขข้อมูลสถานที่เก็บสินค้าสำเร็จ",
      delete: "ลบสถานที่เก็บสินค้าสำเร็จ",
    }
  );

  const onSubmit = (data: StorageFormValues) => {
    if (editingItem) {
      editMutation.mutate({ id: editingItem.id, body: data });
    } else {
      addMutation.mutate(data);
    }
  };

  const columns = [
    { accessorKey: "name", header: "ชื่อคลัง / สถานที่เก็บ" },
    { 
      accessorKey: "address", 
      header: "ที่ตั้งคลังสินค้า", 
      cell: ({ row }: any) => <span className="truncate max-w-sm block">{row.original.address}</span> 
    },
    {
      id: "actions",
      header: "จัดการ",
      cell: ({ row }: any) => {
        const item = row.original as StorageLocation;
        if (item.name === "ส่งมอบโดยตรง (ไม่ผ่านคลัง)") {
          return <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">คลังเสมือนถาวร</span>;
        }
        if (!canManage) {
          return (
            <span title="ไม่มีสิทธิ์จัดการ">
              <Lock className="h-4 w-4 opacity-30" />
            </span>
          );
        }
        return (
          <ActionCell
            onEdit={() => {
              setEditingItem(item);
              setDialogOpen(true);
            }}
            onDelete={() => {
              confirm({
                title: "ยืนยันการลบคลังสินค้า",
                description: `คุณแน่ใจว่าต้องการลบคลังสินค้า "${item.name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
                onConfirm: () => deleteMutation.mutate(item.id)
              });
            }}
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
          <CardTitle className="text-2xl font-extrabold tracking-tight">ข้อมูลสถานที่เก็บ / คลังสินค้า</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            สถานที่เก็บครอบครองสินค้าควบคุมตามที่ขึ้นทะเบียนไว้กับกรมการค้าภายใน
          </CardDescription>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingItem(null);
          }}>
            <DialogTrigger asChild>
              <Button className="font-semibold cursor-pointer text-xs h-8.5 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
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
      </CardHeader>

      {/* Main Full-Height Content: DataTable Flex-1 with internal scroll */}
      <CardContent className="flex-1 overflow-hidden p-6 pt-4 flex flex-col min-h-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-12">กำลังดึงข้อมูล...</p>
        ) : storageData?.data ? (
          <DataTable columns={columns} data={storageData.data} />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">ไม่พบข้อมูลคลังสินค้า</p>
        )}
      </CardContent>
    </Card>
  );
}
