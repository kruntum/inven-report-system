import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Plus, Lock } from "lucide-react";
import { productFormSchema } from "../schemas/index.ts";
import { Product } from "../types/index.ts";
import { useCrudMutations } from "../hooks/useCrudMutations.ts";
import { ActionCell } from "../components/shared/ActionCell.tsx";

type ProductFormValues = z.infer<typeof productFormSchema>;

export function ProductsPage() {
  const user = useAppStore((state) => state.user);
  const isAdmin = user?.roleId === 1;
  const confirm = useConfirm((state) => state.confirm);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Product | null>(null);

  const { data: productsData, isLoading } = useQuery<{ success: boolean; data: Product[] }>({
    queryKey: ["products"],
    queryFn: () => api.get("/products")
  });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ProductFormValues>({
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

  const { addMutation, editMutation, deleteMutation } = useCrudMutations<ProductFormValues>(
    "/products",
    ["products"],
    () => {
      setDialogOpen(false);
      setEditingItem(null);
    },
    {
      add: "เพิ่มสินค้าควบคุมสำเร็จ",
      edit: "แก้ไขข้อมูลสินค้าสำเร็จ",
      delete: "ลบสินค้าสำเร็จ",
    }
  );

  const onSubmit = (data: ProductFormValues) => {
    if (editingItem) {
      editMutation.mutate({ id: editingItem.id, body: data });
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
        const item = row.original as Product;
        if (!isAdmin) {
          return (
            <span title="ต้องเป็นผู้ดูแลระบบ">
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
                title: "ยืนยันการลบสินค้าควบคุม",
                description: `คุณแน่ใจว่าต้องการลบสินค้า "${item.name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
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
          <CardTitle className="text-2xl font-extrabold tracking-tight">ข้อมูลสินค้าควบคุม</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            รายการสินค้าควบคุมที่ขึ้นทะเบียนบัญชีตามประกาศของคณะกรรมการกลางฯ
          </CardDescription>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingItem(null);
          }}>
            <DialogTrigger asChild>
              <Button className="font-semibold cursor-pointer text-xs h-8.5 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
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
                    render={({ field }) => (
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
      </CardHeader>

      {/* Main Full-Height Content: DataTable Flex-1 with internal scroll */}
      <CardContent className="flex-1 overflow-hidden p-6 pt-4 flex flex-col min-h-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-12">กำลังดึงข้อมูล...</p>
        ) : productsData?.data ? (
          <DataTable columns={columns} data={productsData.data} />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">ไม่พบข้อมูลสินค้าควบคุม</p>
        )}
      </CardContent>
    </Card>
  );
}
