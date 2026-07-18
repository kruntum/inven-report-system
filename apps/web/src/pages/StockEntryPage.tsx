import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../lib/api.ts";
import { useConfirm } from "../store/useConfirm.ts";
import { DataTable } from "../components/shared/data-table.tsx";
import { DatePicker } from "../components/shared/date-picker.tsx";
import { formatDate } from "../lib/dayjs.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";

const transactionFormSchema = z.object({
  storageId: z.string().uuid("กรุณาเลือกสถานที่เก็บสินค้า").optional().nullable(),
  isDirectExport: z.boolean().optional().nullable(),
  productId: z.string().uuid("กรุณาเลือกรายการสินค้า"),
  transactionTypeId: z.coerce.number().int().min(1).max(4),
  transactionDate: z.string().min(1, "กรุณาเลือกวันที่ทำรายการ"),
  quantity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "ปริมาณต้องเป็นตัวเลขที่มีค่ามากกว่าศูนย์",
  }),
  unitPrice: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "ราคาต่อหน่วยต้องไม่ติดลบ",
  }).optional(),
  partnerId: z.string().uuid("กรุณาเลือกคู่ค้า").optional().nullable(),
  sourcePartnerId: z.string().uuid("กรุณาเลือกโรงงานต้นทาง").optional().nullable(),
  saleType: z.string().optional().nullable(), // 'domestic' or 'export'
  destinationCountry: z.string().max(100).optional().nullable(),
  productionType: z.string().max(255).optional().nullable(),
  grossWeight: z.string().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
    message: "น้ำหนักรวมสุทธิ/แพ็กเกจต้องไม่ติดลบ",
  }).optional().nullable(),
  netWeight: z.string().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
    message: "น้ำหนักเนื้อต้องไม่ติดลบ",
  }).optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  pricingType: z.string().optional().nullable(), // 'per_unit' | 'per_weight'
  remarks: z.string().max(1000).optional(),
});

export function StockEntryPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm((state) => state.confirm);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingTx, setEditingTx] = React.useState<any | null>(null);

  const { data: storageData } = useQuery({
    queryKey: ["storage-locations"],
    queryFn: () => api.get("/storage")
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get("/products")
  });

  const { data: transactionsData } = useQuery({
    queryKey: ["stock-transactions"],
    queryFn: () => api.get("/stock")
  });

  const createTxMutation = useMutation({
    mutationFn: (data: any) => api.post("/stock", data),
    onSuccess: () => {
      toast.success("บันทึกรายการธุรกรรมคลังสินค้าสำเร็จ");
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["stock-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  });

  const editTxMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/stock/${id}`, data),
    onSuccess: () => {
      toast.success("แก้ไขรายการธุรกรรมคลังสินค้าสำเร็จ");
      setIsModalOpen(false);
      setEditingTx(null);
      queryClient.invalidateQueries({ queryKey: ["stock-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
    }
  });

  const deleteTxMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/stock/${id}`),
    onSuccess: () => {
      toast.success("ลบรายการธุรกรรม (Soft Delete) สำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["stock-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการลบข้อมูล");
    }
  });

  const { data: partnersData } = useQuery({
    queryKey: ["partners"],
    queryFn: () => api.get("/stock/partners")
  });

  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors } } = useForm<z.infer<typeof transactionFormSchema>>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      transactionTypeId: 1,
      transactionDate: new Date().toISOString().split("T")[0],
      storageId: "",
      productId: "",
      quantity: undefined,
      unitPrice: undefined,
      partnerId: "",
      sourcePartnerId: "",
      saleType: "domestic",
      destinationCountry: "",
      productionType: "raw_coconut",
      grossWeight: undefined,
      netWeight: undefined,
      pricingType: "purchase_price",
      isDirectExport: false,
      remarks: ""
    }
  });

  React.useEffect(() => {
    if (editingTx) {
      reset({
        transactionTypeId: editingTx.transactionTypeId,
        storageId: editingTx.storageId || "",
        productId: editingTx.productId,
        transactionDate: editingTx.transactionDate ? new Date(editingTx.transactionDate).toISOString().split("T")[0] : "",
        quantity: editingTx.quantity ? editingTx.quantity.toString() : "",
        unitPrice: editingTx.unitPrice ? editingTx.unitPrice.toString() : "",
        partnerId: editingTx.partnerId || "",
        sourcePartnerId: editingTx.sourcePartnerId || "",
        saleType: editingTx.saleType || "domestic",
        destinationCountry: editingTx.destinationCountry || "",
        productionType: editingTx.productionType || "raw_coconut",
        grossWeight: editingTx.grossWeight ? editingTx.grossWeight.toString() : "",
        netWeight: editingTx.netWeight ? editingTx.netWeight.toString() : "",
        pricingType: editingTx.pricingType || "purchase_price",
        isDirectExport: editingTx.storageId === null || editingTx.storageName === "ส่งมอบโดยตรง (ไม่ผ่านคลัง)",
        remarks: editingTx.remarks || ""
      });
    } else {
      reset({
        transactionTypeId: 1,
        transactionDate: new Date().toISOString().split("T")[0],
        storageId: "",
        productId: "",
        quantity: "",
        unitPrice: "",
        partnerId: "",
        sourcePartnerId: "",
        saleType: "domestic",
        destinationCountry: "",
        productionType: "raw_coconut",
        grossWeight: "",
        netWeight: "",
        pricingType: "purchase_price",
        isDirectExport: false,
        remarks: ""
      });
    }
  }, [editingTx, reset]);

  const watchTxTypeId = watch("transactionTypeId");
  const watchPartnerId = watch("partnerId");
  const watchSaleType = watch("saleType");
  const watchProductId = watch("productId");
  const watchPricingType = watch("pricingType");
  const watchIsDirectExport = watch("isDirectExport");

  const selectedProduct = React.useMemo(() => {
    return productsData?.data?.find((p: any) => p.id === watchProductId);
  }, [productsData, watchProductId]);

  const selectedUnitName = selectedProduct ? selectedProduct.baseUnitName : "";

  const [showAddPartner, setShowAddPartner] = React.useState(false);
  const [newPartnerName, setNewPartnerName] = React.useState("");
  const [newPartnerTypeId, setNewPartnerTypeId] = React.useState(1);
  const [newPartnerRegNo, setNewPartnerRegNo] = React.useState("");
  const [newPartnerAddress, setNewPartnerAddress] = React.useState("");

  const handleCreatePartner = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newPartnerName.trim()) {
      toast.error("กรุณากรอกชื่อคู่ค้า");
      return;
    }
    try {
      const res = await api.post("/stock/partners", {
        name: newPartnerName,
        partnerTypeId: Number(newPartnerTypeId),
        regNo: newPartnerRegNo || null,
        address: newPartnerAddress || null
      });
      if (res.success) {
        toast.success("เพิ่มข้อมูลคู่ค้าใหม่เข้าระบบสำเร็จ");
        queryClient.invalidateQueries({ queryKey: ["partners"] });
        setValue("partnerId", res.data.id);
        setNewPartnerName("");
        setNewPartnerRegNo("");
        setNewPartnerAddress("");
        setShowAddPartner(false);
      } else {
        toast.error(res.error || "เกิดข้อผิดพลาดในการบันทึกคู่ค้า");
      }
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    }
  };

  const onSubmit = (data: z.infer<typeof transactionFormSchema>) => {
    const payload = {
      ...data,
      unit: selectedUnitName || null
    };
    if (editingTx) {
      editTxMutation.mutate({ id: editingTx.id, data: payload });
    } else {
      createTxMutation.mutate(payload);
    }
  };

  const columns = [
    {
      accessorKey: "transactionDate",
      header: "วันที่ทำรายการ",
      cell: ({ row }: any) => formatDate(row.original.transactionDate)
    },
    {
      accessorKey: "storageName",
      header: "สถานที่เก็บ / คลัง"
    },
    {
      accessorKey: "productName",
      header: "รายการสินค้า"
    },
    {
      id: "partner",
      header: "คู่ค้า / ปลายทาง / แหล่งที่มา",
      cell: ({ row }: any) => {
        const mainName = row.original.partnerName;
        const sourceName = row.original.sourcePartnerName;
        const saleType = row.original.saleType;
        const country = row.original.destinationCountry;

        if (!mainName) return "-";
        
        let display = mainName;
        if (sourceName) {
          display += ` (ได้มาจากโรงงาน: ${sourceName})`;
        }
        if (saleType === "export" && country) {
          display += ` [ส่งออก: ${country}]`;
        } else if (saleType === "domestic") {
          display += " [ในประเทศ]";
        }
        return <span className="text-xs font-semibold">{display}</span>;
      }
    },
    {
      accessorKey: "transactionTypeName",
      header: "ประเภท",
      cell: ({ row }: any) => {
        const typeId = row.original.transactionTypeId;
        const colors = {
          1: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
          2: "bg-blue-500/10 text-blue-500 border-blue-500/20",
          3: "bg-amber-500/10 text-amber-500 border-amber-500/20",
          4: "bg-purple-500/10 text-purple-500 border-purple-500/20"
        } as Record<number, string>;
        return (
          <Badge variant="outline" className={colors[typeId]}>
            {row.original.transactionTypeName}
          </Badge>
        );
      }
    },
    {
      accessorKey: "quantity",
      header: "ปริมาณ / น้ำหนัก",
      cell: ({ row }: any) => {
        const qty = Number(row.original.quantity);
        const unitName = row.original.unit || row.original.baseUnitName || "";
        const netWeight = row.original.netWeight ? Number(row.original.netWeight) : null;
        const grossWeight = row.original.grossWeight ? Number(row.original.grossWeight) : null;
        
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold">{qty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })} {unitName}</span>
            {(netWeight !== null || grossWeight !== null) && (
              <span className="text-[11px] text-muted-foreground font-medium">
                {netWeight !== null && `เนื้อ: ${netWeight.toLocaleString()} กก.`}
                {netWeight !== null && grossWeight !== null && " | "}
                {grossWeight !== null && `รวมกล่อง: ${grossWeight.toLocaleString()} กก.`}
              </span>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: "unitPrice",
      header: "ราคาต่อหน่วย",
      cell: ({ row }: any) => {
        if (!row.original.unitPrice) return "-";
        const price = Number(row.original.unitPrice);
        const pricingType = row.original.pricingType; // 'per_unit' | 'per_weight'
        
        let label = "บาท/หน่วย";
        if (pricingType === "per_weight") {
          label = "บาท/กก.";
        } else if (pricingType === "per_unit" && row.original.baseUnitName) {
          label = `บาท/${row.original.baseUnitName}`;
        }
        
        return (
          <div className="flex flex-col">
            <span className="font-semibold">{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        );
      }
    },
    {
      id: "actions",
      header: "จัดการ",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setEditingTx(row.original);
              setIsModalOpen(true);
            }}
            className="text-primary hover:bg-primary/10 p-1.5 rounded-lg cursor-pointer transition-colors"
            title="แก้ไขข้อมูลธุรกรรม"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              confirm({
                title: "ยืนยันการลบรายการธุรกรรม",
                description: "คุณแน่ใจว่าต้องการลบรายการธุรกรรมคลังสินค้านี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้",
                onConfirm: () => deleteTxMutation.mutate(row.original.id)
              });
            }}
            className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg cursor-pointer transition-colors"
            title="ลบข้อมูลธุรกรรม"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">บันทึกรายการประจำวัน</h1>
          <p className="text-muted-foreground text-sm">ข้อมูลรับซื้อ จำหน่าย และนำไปใช้แปรรูป ประจำแต่ละคลังสินค้า</p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingTx(null);
        }}>
          <DialogTrigger asChild>
            <Button className="font-semibold cursor-pointer">+ บันทึกธุรกรรมคลังสินค้า</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] p-5">
            <DialogHeader className="pb-1">
              <DialogTitle className="text-base font-extrabold">
                {editingTx ? "แก้ไขธุรกรรมคลังสินค้า" : "บันทึกธุรกรรมรายวัน"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                กรอกหรือแก้ไขข้อมูลรับซื้อ จำหน่าย หรือปรับปรุงยอด เพื่อลงบัญชีคุมของแต่ละคลังควบคุม
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">ประเภทรายการ</Label>
                  <Controller
                    name="transactionTypeId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="เลือกประเภทรายการ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">รับซื้อ (ซื้อผลสด / สินค้าสำเร็จรูปแปรรูป)</SelectItem>
                          <SelectItem value="2">จำหน่าย (ขายออกในประเทศ / ส่งออกต่างประเทศ)</SelectItem>
                          <SelectItem value="3">ใช้ผลิต (เข้ากระบวนการแปรรูปในโรงงาน)</SelectItem>
                          <SelectItem value="4">ปรับปรุงยอด (ปรับลด / ปรับเพิ่มยอดคลัง)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-0.5 sm:col-span-2 flex items-center gap-2 border border-dashed border-border/85 p-2 rounded-lg bg-muted/10">
                  <input
                    type="checkbox"
                    id="isDirectExport"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    {...register("isDirectExport")}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <label
                      htmlFor="isDirectExport"
                      className="text-xs font-bold text-foreground cursor-pointer select-none"
                    >
                      ส่งมอบ/ส่งออกโดยตรง (ไม่ผ่านคลังสินค้า)
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      ในกรณีเป็นนายหน้า/ผู้ส่งออก ซื้อจากโรงงานแล้วส่งออกโดยตรง (ระบบจะจัดสรรคลังเสมือนให้โดยอัตโนมัติ)
                    </p>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">สถานที่เก็บ / คลัง</Label>
                  <Controller
                    name="storageId"
                    control={control}
                    render={({ field }) => (
                      <Select 
                        onValueChange={field.onChange} 
                        value={watchIsDirectExport ? "" : (field.value || undefined)}
                        disabled={!!watchIsDirectExport}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder={watchIsDirectExport ? "คลังเสมือนส่งมอบโดยตรง" : "เลือกสถานที่เก็บ / คลัง"} />
                        </SelectTrigger>
                        <SelectContent>
                          {storageData?.data?.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {!watchIsDirectExport && errors.storageId && (
                    <span className="text-xs text-destructive">{errors.storageId.message}</span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90 mb-0.5">รายการสินค้า</Label>
                  <Controller
                    name="productId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="เลือกประเภทสินค้า" />
                        </SelectTrigger>
                        <SelectContent>
                          {productsData?.data?.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.name} ({p.baseUnitName})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.productId && <span className="text-xs text-destructive">{errors.productId.message}</span>}
                </div>

                <Controller
                  name="transactionDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="วันที่ทำรายการ"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.transactionDate?.message}
                    />
                  )}
                />

                {/* Dynamic Partner & Export Fields */}
                {watchTxTypeId === 1 && (
                  <div className="space-y-2.5 border-t border-border pt-2.5 sm:col-span-2">
                    <div className="flex items-center justify-between pb-0.5">
                      <Label className="text-[11px] font-bold text-muted-foreground/90">ข้อมูลคู่ค้าที่รับซื้อ</Label>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowAddPartner(!showAddPartner)} 
                        className="text-[10px] h-6 text-primary cursor-pointer hover:bg-primary/10"
                      >
                        {showAddPartner ? "ยกเลิก" : "+ เพิ่มคู่ค้าใหม่"}
                      </Button>
                    </div>

                    {showAddPartner ? (
                      <div className="rounded-lg border border-border/80 p-2.5 bg-muted/30 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <span className="text-[10px] font-bold block text-foreground sm:col-span-2">ลงทะเบียนคู่ค้าใหม่</span>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-semibold text-muted-foreground/90">ชื่อคู่ค้า</Label>
                          <Input 
                            placeholder="เช่น โรงงานสามพราน, สวนลุงพงษ์" 
                            value={newPartnerName} 
                            onChange={(e) => setNewPartnerName(e.target.value)} 
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-semibold text-muted-foreground/90">ประเภทคู่ค้า</Label>
                          <Select 
                            value={newPartnerTypeId.toString()} 
                            onValueChange={(val) => setNewPartnerTypeId(Number(val))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="เลือกประเภท" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">โรงงานแปรรูป (DOA Number)</SelectItem>
                              <SelectItem value="2">สวน/เกษตรกร (GAP Number)</SelectItem>
                              <SelectItem value="3">ผู้รวบรวม/ลานเท</SelectItem>
                              <SelectItem value="4">บริษัททั่วไป</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {(newPartnerTypeId === 1 || newPartnerTypeId === 2) && (
                          <div className="space-y-0.5 sm:col-span-2">
                            <Label className="text-[10px] font-semibold text-muted-foreground/90">
                              {newPartnerTypeId === 1 ? "เลขทะเบียนโรงงาน (DOA Number)" : "เลขทะเบียนสวน (GAP Number)"}
                            </Label>
                            <Input 
                              placeholder="ระบุเลขทะเบียนคุม" 
                              value={newPartnerRegNo} 
                              onChange={(e) => setNewPartnerRegNo(e.target.value)} 
                              className="h-8 text-xs"
                            />
                          </div>
                        )}
                        <div className="space-y-0.5 sm:col-span-2">
                          <Label className="text-[10px] font-semibold text-muted-foreground/90">ที่อยู่ / รายละเอียด</Label>
                          <Textarea 
                            placeholder="ระบุที่อยู่คู่ค้า..." 
                            value={newPartnerAddress} 
                            onChange={(e) => setNewPartnerAddress(e.target.value)} 
                            rows={1}
                            className="text-xs min-h-[36px] p-2"
                          />
                        </div>
                        <Button 
                          type="button" 
                          size="sm" 
                          onClick={handleCreatePartner}
                          className="w-full h-8 text-xs font-semibold cursor-pointer sm:col-span-2"
                        >
                          บันทึกคู่ค้าใหม่
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="space-y-0.5">
                          <Label className="text-[11px] font-bold text-muted-foreground/90">รับซื้อจาก (ชื่อคู่ค้า)</Label>
                          <Controller
                            name="partnerId"
                            control={control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="เลือกคู่ค้าผู้ขาย" />
                                </SelectTrigger>
                                <SelectContent>
                                  {partnersData?.data?.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name} ({p.partnerTypeName}) {p.regNo ? `[${p.regNo}]` : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        {/* If selected partner is a collector (type 3), show origin factory tracking */}
                        {partnersData?.data?.find((p: any) => p.id === watchPartnerId)?.partnerTypeId === 3 && (
                          <div className="space-y-1 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                            <Label className="text-[10px] font-semibold text-amber-700 flex items-center gap-1">
                              ⚠️ ระบุแหล่งผลิต / โรงงานต้นทาง (ที่ลานเทไปรับมา)
                            </Label>
                            <Controller
                              name="sourcePartnerId"
                              control={control}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                  <SelectTrigger className="h-8 text-xs bg-background">
                                    <SelectValue placeholder="เลือกโรงงาน/สวนต้นทาง" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {partnersData?.data
                                      ?.filter((p: any) => p.partnerTypeId === 1 || p.partnerTypeId === 2)
                                      ?.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.name} {p.regNo ? `[${p.regNo}]` : ""}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {watchTxTypeId === 2 && (
                  <div className="space-y-2 border-t border-border pt-2.5 sm:col-span-2">
                    <div className="flex items-center justify-between pb-0.5">
                      <Label className="text-[11px] font-bold text-muted-foreground/90">ข้อมูลจำหน่าย / ส่งออก</Label>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowAddPartner(!showAddPartner)} 
                        className="text-[10px] h-6 text-primary cursor-pointer hover:bg-primary/10"
                      >
                        {showAddPartner ? "ยกเลิก" : "+ เพิ่มคู่ค้าใหม่"}
                      </Button>
                    </div>

                    {showAddPartner ? (
                      <div className="rounded-lg border border-border/80 p-2.5 bg-muted/30 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <span className="text-[10px] font-bold block text-foreground sm:col-span-2">ลงทะเบียนคู่ค้าใหม่</span>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-semibold text-muted-foreground/90">ชื่อคู่ค้า / ลูกค้า</Label>
                          <Input 
                            placeholder="เช่น บริษัทผู้ซื้อต่างประเทศ, หจก. ในประเทศ" 
                            value={newPartnerName} 
                            onChange={(e) => setNewPartnerName(e.target.value)} 
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-semibold text-muted-foreground/90">ประเภทคู่ค้า</Label>
                          <Select 
                            value={newPartnerTypeId.toString()} 
                            onValueChange={(val) => setNewPartnerTypeId(Number(val))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="เลือกประเภท" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="4">บริษัททั่วไป</SelectItem>
                              <SelectItem value="1">โรงงานแปรรูป</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-0.5 sm:col-span-2">
                          <Label className="text-[10px] font-semibold text-muted-foreground/90">ที่อยู่ / รายละเอียด</Label>
                          <Textarea 
                            placeholder="ระบุที่อยู่คู่ค้า..." 
                            value={newPartnerAddress} 
                            onChange={(e) => setNewPartnerAddress(e.target.value)} 
                            rows={1}
                            className="text-xs min-h-[36px] p-2"
                          />
                        </div>
                        <Button 
                          type="button" 
                          size="sm" 
                          onClick={handleCreatePartner}
                          className="w-full h-8 text-xs font-semibold cursor-pointer sm:col-span-2"
                        >
                          บันทึกคู่ค้าใหม่
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-[11px] font-bold text-muted-foreground/90">ช่องทางจำหน่าย</Label>
                          <Controller
                            name="saleType"
                            control={control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="ในประเทศ / ส่งออก" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="domestic">ในประเทศ (Domestic)</SelectItem>
                                  <SelectItem value="export">ส่งออก (Export)</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        <div className="space-y-0.5">
                          <Label className="text-[11px] font-bold text-muted-foreground/90">ลูกค้าผู้ซื้อ</Label>
                          <Controller
                            name="partnerId"
                            control={control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="เลือกบริษัทผู้ซื้อ" />
                                </SelectTrigger>
                                <SelectContent>
                                  {partnersData?.data?.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        {watchSaleType === "export" && (
                          <div className="space-y-0.5 sm:col-span-2">
                            <Label className="text-[11px] font-bold text-muted-foreground/90">ประเทศปลายทางส่งออก</Label>
                            <Input
                              type="text"
                              placeholder="ระบุประเทศปลายทาง เช่น สหรัฐอเมริกา, สิงคโปร์"
                              {...register("destinationCountry")}
                              className="h-8 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {watchTxTypeId === 3 && (
                  <div className="space-y-0.5 border-t border-border pt-2 sm:col-span-2">
                    <Label className="text-[11px] font-bold text-muted-foreground/90">รูปแบบการผลิต / สินค้าแปรรูปสำเร็จรูป</Label>
                    <Input
                      type="text"
                      placeholder="เช่น น้ำมะพร้าวบรรจุกล่องสำเร็จรูป UHT"
                      {...register("productionType")}
                      className="h-8 text-xs"
                    />
                  </div>
                )}

                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90">ปริมาณสินค้า {selectedUnitName ? `(${selectedUnitName})` : ""}</Label>
                  <Input
                    type="text"
                    placeholder={`ระบุจำนวนหน่วยสินค้า ${selectedUnitName ? `(${selectedUnitName})` : ""}`}
                    {...register("quantity")}
                    className="h-8 text-xs"
                  />
                  {errors.quantity && <span className="text-xs text-destructive">{errors.quantity.message}</span>}
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90">น้ำหนักเนื้อ ไม่รวมกล่อง (กิโลกรัม)</Label>
                  <Input
                    type="text"
                    placeholder="ระบุน้ำหนักเนื้อสุทธิ (กิโลกรัม)"
                    {...register("netWeight")}
                    className="h-8 text-xs"
                  />
                  {errors.netWeight && <span className="text-xs text-destructive">{errors.netWeight.message}</span>}
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90">น้ำหนักรวมแพ็กเกจ (กิโลกรัม)</Label>
                  <Input
                    type="text"
                    placeholder="ระบุน้ำหนักรวมทั้งหมด (กิโลกรัม)"
                    {...register("grossWeight")}
                    className="h-8 text-xs"
                  />
                  {errors.grossWeight && <span className="text-xs text-destructive">{errors.grossWeight.message}</span>}
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90">คำนวณราคาต่อ</Label>
                  <Controller
                    name="pricingType"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="เลือกการคำนวณราคา" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per_unit">ต่อหน่วยสินค้า {selectedUnitName ? `(${selectedUnitName})` : ""}</SelectItem>
                          <SelectItem value="per_weight">ต่อน้ำหนักสินค้า (กิโลกรัม)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[11px] font-bold text-muted-foreground/90">
                    {watchPricingType === "per_weight" 
                      ? "ราคาต่อกิโลกรัม (บาท)" 
                      : `ราคาต่อหน่วยสินค้า ${selectedUnitName ? `(${selectedUnitName})` : ""} (บาท)`}
                  </Label>
                  <Input
                    type="text"
                    placeholder="ระบุราคาต่อหน่วย (ซื้อ/ขาย)"
                    {...register("unitPrice")}
                    className="h-8 text-xs"
                  />
                  {errors.unitPrice && <span className="text-xs text-destructive">{errors.unitPrice.message}</span>}
                </div>

                <div className="space-y-0.5 sm:col-span-2">
                  <Label className="text-[11px] font-bold text-muted-foreground/90">หมายเหตุ / คำอธิบาย</Label>
                  <Textarea
                    placeholder="ระบุข้อมูลเพิ่มเติม (ถ้ามี)"
                    rows={2}
                    {...register("remarks")}
                    className="text-xs min-h-[44px] p-2"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createTxMutation.isPending || editTxMutation.isPending}
                  className="w-full sm:col-span-2 cursor-pointer font-bold h-8.5 text-xs mt-2"
                >
                  {createTxMutation.isPending || editTxMutation.isPending 
                    ? "กำลังบันทึก..." 
                    : (editingTx ? "บันทึกการแก้ไขรายการ" : "บันทึกรายการบัญชีคุม")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 1 Column Layout: Full Width Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>รายการบันทึกบัญชีสินค้าสะสม</CardTitle>
          <CardDescription>ประวัติการเคลื่อนไหวคลังทั้งหมดในระบบ</CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsData?.data ? (
            <DataTable columns={columns} data={transactionsData.data} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">กำลังดึงข้อมูลธุรกรรมรายวัน...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}