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
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Plus, Lock } from "lucide-react";
import { partnerFormSchema } from "../schemas/index.ts";
import { Partner } from "../types/index.ts";
import { useCrudMutations } from "../hooks/useCrudMutations.ts";
import { ActionCell } from "../components/shared/ActionCell.tsx";

type PartnerFormValues = z.infer<typeof partnerFormSchema>;

export function PartnersPage() {
  const user = useAppStore((state) => state.user);
  const isAdmin = user?.roleId === 1;
  const isDataEntry = user?.roleId === 2;
  const canManage = isAdmin || isDataEntry;
  const confirm = useConfirm((state) => state.confirm);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Partner | null>(null);

  const { data: partnersData, isLoading } = useQuery<{ success: boolean; data: Partner[] }>({
    queryKey: ["partners"],
    queryFn: () => api.get("/stock/partners")
  });

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<PartnerFormValues>({
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

  const { addMutation, editMutation, deleteMutation } = useCrudMutations<PartnerFormValues>(
    "/stock/partners",
    ["partners"],
    () => {
      setDialogOpen(false);
      setEditingItem(null);
    },
    {
      add: "เพิ่มข้อมูลคู่ค้าสำเร็จ",
      edit: "แก้ไขข้อมูลคู่ค้าสำเร็จ",
      delete: "ลบข้อมูลคู่ค้าสำเร็จ",
    }
  );

  const onSubmit = (data: PartnerFormValues) => {
    if (editingItem) {
      editMutation.mutate({ id: editingItem.id, body: data });
    } else {
      addMutation.mutate(data);
    }
  };

  const columns = [
    { accessorKey: "name", header: "ชื่อคู่ค้า / เกษตรกร / โรงงาน" },
    { accessorKey: "partnerTypeName", header: "ประเภทคู่ค้า" },
    { accessorKey: "regNo", header: "เลขทะเบียนคุม (DOA/GAP)", cell: ({ row }: any) => row.original.regNo || "-" },
    { 
      accessorKey: "address", 
      header: "ที่อยู่/รายละเอียด", 
      cell: ({ row }: any) => <span className="truncate max-w-xs block">{row.original.address || "-"}</span> 
    },
    {
      id: "actions",
      header: "จัดการ",
      cell: ({ row }: any) => {
        const item = row.original as Partner;
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
                title: "ยืนยันการลบข้อมูลคู่ค้า",
                description: `คุณแน่ใจว่าต้องการลบคู่ค้า "${item.name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
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
          <CardTitle className="text-2xl font-extrabold tracking-tight">ข้อมูลคู่ค้า / เกษตรกร</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            ผู้ขายวัตถุดิบต้นทาง (สวน GAP/โรงงาน DOA) หรือลูกค้าผู้รับซื้อสินค้าปลายทาง
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
                    render={({ field }) => (
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
      </CardHeader>

      {/* Main Full-Height Content: DataTable Flex-1 with internal scroll */}
      <CardContent className="flex-1 overflow-hidden p-6 pt-4 flex flex-col min-h-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-12">กำลังดึงข้อมูล...</p>
        ) : partnersData?.data ? (
          <DataTable columns={columns} data={partnersData.data} />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">ไม่พบข้อมูลคู่ค้า</p>
        )}
      </CardContent>
    </Card>
  );
}
