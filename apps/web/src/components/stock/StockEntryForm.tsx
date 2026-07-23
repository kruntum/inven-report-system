import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../lib/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { DatePicker } from "../shared/date-picker.tsx";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog.tsx";
import { transactionFormSchema } from "../../schemas/index.ts";
import { StockTransaction, Product, StorageLocation, Partner } from "../../types/index.ts";
import { QuickPartnerForm } from "./QuickPartnerForm.tsx";

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface StockEntryFormProps {
  editingTx: StockTransaction | null;
  onSuccess: () => void;
  onClose?: () => void;
}

export function StockEntryForm({ editingTx, onSuccess, onClose }: StockEntryFormProps) {
  const queryClient = useQueryClient();
  const [showAddPartner, setShowAddPartner] = React.useState(false);

  const { data: storageData } = useQuery<{ success: boolean; data: StorageLocation[] }>({
    queryKey: ["storage-locations"],
    queryFn: () => api.get("/storage")
  });

  const { data: productsData } = useQuery<{ success: boolean; data: Product[] }>({
    queryKey: ["products"],
    queryFn: () => api.get("/products")
  });

  const { data: partnersData } = useQuery<{ success: boolean; data: Partner[] }>({
    queryKey: ["partners"],
    queryFn: () => api.get("/stock/partners")
  });

  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors } } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
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
      invoiceNo: "",
      containerNo: "",
      productionType: "raw_coconut",
      grossWeight: "",
      netWeight: "",
      pricingType: "per_unit",
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
        transactionDate: editingTx.transactionDate ? editingTx.transactionDate.substring(0, 10) : "",
        quantity: editingTx.quantity ? editingTx.quantity.toString() : "",
        unitPrice: editingTx.unitPrice ? editingTx.unitPrice.toString() : "",
        partnerId: editingTx.partnerId || "",
        sourcePartnerId: editingTx.sourcePartnerId || "",
        saleType: editingTx.saleType || "domestic",
        destinationCountry: editingTx.destinationCountry || "",
        invoiceNo: editingTx.invoiceNo || "",
        containerNo: editingTx.containerNo || "",
        productionType: editingTx.productionType || "raw_coconut",
        grossWeight: editingTx.grossWeight ? editingTx.grossWeight.toString() : "",
        netWeight: editingTx.netWeight ? editingTx.netWeight.toString() : "",
        pricingType: editingTx.pricingType || "per_unit",
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
        invoiceNo: "",
        containerNo: "",
        productionType: "raw_coconut",
        grossWeight: "",
        netWeight: "",
        pricingType: "per_unit",
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
    return productsData?.data?.find((p) => p.id === watchProductId);
  }, [productsData, watchProductId]);

  const selectedUnitName = selectedProduct ? selectedProduct.baseUnitName || "หน่วย" : "";

  const isMiddleman = React.useMemo(() => {
    return partnersData?.data?.find((p) => p.id === watchPartnerId)?.partnerTypeId === 3;
  }, [partnersData, watchPartnerId]);

  const createTxMutation = useMutation({
    mutationFn: (data: any) => api.post("/stock", data),
    onSuccess: () => {
      toast.success("บันทึกรายการธุรกรรมคลังสินค้าสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["stock-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  });

  const editTxMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/stock/${id}`, data),
    onSuccess: () => {
      toast.success("แก้ไขรายการธุรกรรมคลังสินค้าสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["stock-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
    }
  });

  const onSubmit = (data: TransactionFormValues) => {
    // Clean empty strings to null for backend schema compatibility
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, val]) => [
        key,
        val === "" ? null : val
      ])
    );

    const payload = {
      ...cleanedData,
      unit: selectedUnitName || null,
      storageId: watchIsDirectExport ? null : (cleanedData.storageId || null),
    };

    if (editingTx && editingTx.id) {
      editTxMutation.mutate({ id: editingTx.id, data: payload });
    } else {
      createTxMutation.mutate(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden">
      {/* Pinned Header */}
      <div className="p-5 pb-3 border-b border-border/60 shrink-0 bg-card">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold">
            {editingTx ? (editingTx.id ? "แก้ไขธุรกรรมคลังสินค้า" : "คัดลอกธุรกรรมคลังสินค้า") : "บันทึกธุรกรรมรายวัน"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            กรอกหรือแก้ไขข้อมูลรับซื้อ จำหน่าย หรือปรับปรุงยอด เพื่อลงบัญชีคุมของแต่ละคลังควบคุม
          </DialogDescription>
        </DialogHeader>
      </div>

      {/* Scrollable Form Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-2.5">
        
        {/* Row 1 */}
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-muted-foreground/90">ประเภทรายการ</Label>
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

        <div className="md:col-span-2 flex items-center gap-3 border border-dashed border-border/80 p-2 rounded-md bg-muted/5 self-end h-8">
          <Controller
            name="isDirectExport"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="isDirectExport"
                checked={!!field.value}
                onCheckedChange={field.onChange}
                className="cursor-pointer"
              />
            )}
          />
          <div className="grid gap-0.5 leading-none">
            <label
              htmlFor="isDirectExport"
              className="text-xs font-bold text-foreground cursor-pointer select-none"
            >
              ส่งมอบ/ส่งออกโดยตรง (ไม่ผ่านคลังสินค้า)
            </label>
            <p className="text-[9px] text-muted-foreground">
              ในกรณีเป็นนายหน้า/ผู้ส่งออก ซื้อจากโรงงานแล้วส่งออกโดยตรง (ระบบจะจัดสรรคลังเสมือนให้อัตโนมัติ)
            </p>
          </div>
        </div>

        {/* Row 2 */}
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-muted-foreground/90">สถานที่เก็บ / คลัง</Label>
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
                  {storageData?.data?.map((s) => (
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

        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-muted-foreground/90">รายการสินค้า</Label>
          <Controller
            name="productId"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="เลือกประเภทสินค้า" />
                </SelectTrigger>
                <SelectContent>
                  {productsData?.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.baseUnitName})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.productId && <span className="text-xs text-destructive">{errors.productId.message}</span>}
        </div>

        <div className="space-y-1">
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
        </div>

        {/* Dynamic Partner & Export Fields */}
        {(watchTxTypeId === 1 || watchTxTypeId === 2) && (
          <div className="space-y-2.5 border-y border-border py-3 md:col-span-3">
            <div className="flex items-center justify-between pb-0.5">
              <Label className="text-[11px] font-bold text-muted-foreground/90">
                {watchTxTypeId === 1 ? "ข้อมูลคู่ค้าที่รับซื้อ" : "ข้อมูลจำหน่าย / ส่งออก"}
              </Label>
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
              <div className="md:col-span-3">
                <QuickPartnerForm 
                  initialTypeId={watchTxTypeId === 1 ? 1 : 4}
                  onSuccess={(id) => {
                    setValue("partnerId", id);
                    setShowAddPartner(false);
                  }}
                  onCancel={() => setShowAddPartner(false)}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                {watchTxTypeId === 2 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
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

                    <div className={watchSaleType === "export" ? "space-y-1" : "space-y-1 md:col-span-2"}>
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
                              {partnersData?.data?.map((p) => (
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
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-muted-foreground/90">ประเทศปลายทางส่งออก</Label>
                        <Input
                          type="text"
                          placeholder="ระบุประเทศปลายทาง เช่น สหรัฐอเมริกา"
                          {...register("destinationCountry")}
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                    )}

                    {/* Invoice & Container for sales */}
                    <div className={watchSaleType === "export" ? "space-y-1 md:col-span-1" : "space-y-1 md:col-span-3"}>
                      <Label className="text-[11px] font-bold text-muted-foreground/90">เลขที่ใบกำกับภาษี / อินวอยซ์</Label>
                      <Input
                        type="text"
                        placeholder="ระบุเลขที่อินวอยซ์"
                        {...register("invoiceNo")}
                        className="h-8 text-xs bg-background"
                      />
                    </div>

                    {watchSaleType === "export" && (
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-[11px] font-bold text-muted-foreground/90">เลขตู้คอนเทนเนอร์ / เบอร์ตู้</Label>
                        <Input
                          type="text"
                          placeholder="ระบุเลขตู้คอนเทนเนอร์ เช่น MSKU1234567"
                          {...register("containerNo")}
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                    )}
                  </div>
                )}

                {watchTxTypeId === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className={isMiddleman ? "space-y-1 md:col-span-2" : "space-y-1 md:col-span-3"}>
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
                              {partnersData?.data?.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} ({p.partnerTypeName}) {p.regNo ? `[${p.regNo}]` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    {isMiddleman && (
                      <div className="space-y-1 md:col-span-1">
                        <Label className="text-[10px] font-semibold text-amber-700 dark:text-amber-500 flex items-center gap-1">
                          ⚠️ ระบุแหล่งผลิต / โรงงานต้นทาง
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
                                  ?.filter((p) => p.partnerTypeId === 1 || p.partnerTypeId === 2)
                                  ?.map((p) => (
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

                    {/* Invoice for buys */}
                    <div className="space-y-1 md:col-span-3">
                      <Label className="text-[11px] font-bold text-muted-foreground/90">เลขที่ใบกำกับภาษี / อินวอยซ์</Label>
                      <Input
                        type="text"
                        placeholder="ระบุเลขที่อินวอยซ์"
                        {...register("invoiceNo")}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(watchTxTypeId === 1 || watchTxTypeId === 2 || watchTxTypeId === 3) && (
          <div className="space-y-1 border-t border-border pt-2 md:col-span-3">
            <Label className="text-[11px] font-bold text-muted-foreground/90">
              {watchTxTypeId === 1 && "รูปแบบสินค้าที่รับซื้อ (เช่น มะพร้าวควั่น, มะพร้าวเจีย)"}
              {watchTxTypeId === 2 && "รูปแบบสินค้าที่จำหน่าย (เช่น มะพร้าวควั่น, มะพร้าวเจีย)"}
              {watchTxTypeId === 3 && "รูปแบบการผลิต / สินค้าแปรรูปสำเร็จรูป"}
            </Label>
            <Input
              type="text"
              placeholder={watchTxTypeId === 3 
                ? "เช่น น้ำมะพร้าวบรรจุกล่องสำเร็จรูป UHT" 
                : "ระบุรูปแบบลักษณะสินค้า เช่น มะพร้าวควั่น, มะพร้าวเจีย"
              }
              {...register("productionType")}
              className="h-8 text-xs bg-background"
            />
          </div>
        )}

        {/* Row 3 - Numeric Inputs */}
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-muted-foreground/90">ปริมาณสินค้า {selectedUnitName ? `(${selectedUnitName})` : ""}</Label>
          <Input
            type="text"
            placeholder={`ระบุจำนวนหน่วย ${selectedUnitName ? `(${selectedUnitName})` : ""}`}
            {...register("quantity")}
            className="h-8 text-xs bg-background"
          />
          {errors.quantity && <span className="text-xs text-destructive">{errors.quantity.message}</span>}
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-muted-foreground/90">น้ำหนักเนื้อ ไม่รวมกล่อง (กิโลกรัม)</Label>
          <Input
            type="text"
            placeholder="ระบุน้ำหนักเนื้อสุทธิ (กิโลกรัม)"
            {...register("netWeight")}
            className="h-8 text-xs bg-background"
          />
          {errors.netWeight && <span className="text-xs text-destructive">{errors.netWeight.message}</span>}
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-muted-foreground/90">น้ำหนักรวมแพ็กเกจ (กิโลกรัม)</Label>
          <Input
            type="text"
            placeholder="ระบุน้ำหนักรวมทั้งหมด (กิโลกรัม)"
            {...register("grossWeight")}
            className="h-8 text-xs bg-background"
          />
          {errors.grossWeight && <span className="text-xs text-destructive">{errors.grossWeight.message}</span>}
        </div>

        {/* Row 4 - Pricing & Unit Price */}
        <div className="space-y-1">
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

        <div className="space-y-1 md:col-span-2">
          <Label className="text-[11px] font-bold text-muted-foreground/90">
            {watchPricingType === "per_weight" 
              ? "ราคาต่อกิโลกรัม (บาท)" 
              : `ราคาต่อหน่วยสินค้า ${selectedUnitName ? `(${selectedUnitName})` : ""} (บาท)`}
          </Label>
          <Input
            type="text"
            placeholder="ระบุราคาต่อหน่วย (ซื้อ/ขาย)"
            {...register("unitPrice")}
            className="h-8 text-xs bg-background"
          />
          {errors.unitPrice && <span className="text-xs text-destructive">{errors.unitPrice.message}</span>}
        </div>

        {/* Row 5 - Remarks */}
        <div className="space-y-1 md:col-span-3">
          <Label className="text-[11px] font-bold text-muted-foreground/90">หมายเหตุ / คำอธิบาย</Label>
          <Textarea
            placeholder="ระบุข้อมูลเพิ่มเติม (ถ้ามี)"
            rows={2}
            {...register("remarks")}
            className="text-xs min-h-[44px] p-2 bg-background"
          />
        </div>

        </div>
      </div>
      </ScrollArea>

      {/* Pinned Footer */}
      <DialogFooter className="p-4 px-5 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2 shrink-0">
        {onClose && (
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8 text-xs px-4 cursor-pointer font-medium"
          >
            ยกเลิก
          </Button>
        )}
        <Button
          type="submit"
          disabled={createTxMutation.isPending || editTxMutation.isPending}
          className="h-8 text-xs px-5 cursor-pointer font-bold bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {createTxMutation.isPending || editTxMutation.isPending 
            ? "กำลังบันทึก..." 
            : (editingTx && editingTx.id ? "บันทึกการแก้ไขรายการ" : "บันทึกรายการบัญชีคุม")}
        </Button>
      </DialogFooter>
    </form>
  );
}
