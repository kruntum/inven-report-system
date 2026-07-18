import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../lib/api.ts";
import { useConfirm } from "../store/useConfirm.ts";
import { PdfReportViewer } from "../components/PdfReportViewer.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Calendar } from "lucide-react";
import { toast } from "sonner";

const generateReportFormSchema = z.object({
  reportMonth: z.coerce.number().int().min(1).max(12),
  reportYear: z.coerce.number().int().min(2000).max(2100),
  productId: z.string().uuid("กรุณาเลือกรายการสินค้า"),
  storageId: z.string().optional().nullable(),
});

export function MonthlyReportsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm((state: any) => state.confirm);
  const [previewReportId, setPreviewReportId] = React.useState<string | null>(null);
  const userFullName: string = (queryClient.getQueryData<any>(["user"])?.fullName || "").replace(" (ผู้ดูแลระบบ)", "") || "สมชาย ยอดมะพร้าว";

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get("/products")
  });

  const { data: reportsData } = useQuery({
    queryKey: ["monthly-reports"],
    queryFn: () => api.get("/reports")
  });

  const generateReportMutation = useMutation({
    mutationFn: (data: any) => api.post("/reports/generate", data),
    onSuccess: () => {
      toast.success("ประมวลผลสรุปราคาเฉลี่ยและคงคลังยกไป (Draft) สำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการคำนวณ");
    }
  });

  const submitReportMutation = useMutation({
    mutationFn: (id: string) => api.post(`/reports/submit/${id}`, {}),
    onSuccess: () => {
      toast.success("นำส่งรายงาน สกกร. สำเร็จและระบบได้ทำการล็อกข้อมูลเรียบร้อย");
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการนำส่ง");
    }
  });

  const revertReportMutation = useMutation({
    mutationFn: (id: string) => api.post(`/reports/revert/${id}`, {}),
    onSuccess: () => {
      toast.success("ดึงรายงานกลับสำเร็จ ปลดล็อกคลังประจำช่วงเวลานี้แล้ว");
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
      queryClient.invalidateQueries({ queryKey: ["stock-transactions"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการดึงรายงานกลับ");
    }
  });
  const { handleSubmit, control, formState: { errors } } = useForm<z.infer<typeof generateReportFormSchema>>({
    resolver: zodResolver(generateReportFormSchema),
    defaultValues: {
      reportMonth: new Date().getMonth() + 1,
      reportYear: new Date().getFullYear()
    }
  });

  const onSubmit = (data: z.infer<typeof generateReportFormSchema>) => {
    generateReportMutation.mutate(data);
  };

  return (
    <>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">รายงาน สกกร. ประจำเดือน</h1>
        <p className="text-muted-foreground text-sm">ประมวลผลคำนวณราคาซื้อเฉลี่ยถ่วงน้ำหนักและปริมาณสินค้าสะสมนำส่งกรมการค้าภายใน</p>
      </div>

      {/* Grid for Actions and Reports List */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Action generation Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm h-fit space-y-4">
          <div className="border-b border-border pb-2 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-lg text-foreground">ประมวลผลบัญชีคุมสินค้า</h3>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>เดือน</Label>
                <Controller
                  name="reportMonth"
                  control={control}
                  render={({ field }: { field: any }) => (
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกเดือน" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <SelectItem key={m} value={m.toString()}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label>ปี (ค.ศ.)</Label>
                <Controller
                  name="reportYear"
                  control={control}
                  render={({ field }: { field: any }) => (
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกปี" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2026">2026</SelectItem>
                        <SelectItem value="2027">2027</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>รายการสินค้า</Label>
              <Controller
                name="productId"
                control={control}
                render={({ field }: { field: any }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกสินค้าคุม" />
                    </SelectTrigger>
                    <SelectContent>
                      {productsData?.data?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.productId && <span className="text-xs text-destructive">{errors.productId.message}</span>}
            </div>

            <Button
              type="submit"
              disabled={generateReportMutation.isPending}
              className="w-full"
            >
              {generateReportMutation.isPending ? "กำลังคำนวณ..." : "เริ่มประมวลผลสิ้นเดือน"}
            </Button>
          </form>
          <div className="rounded-lg bg-muted/40 p-3 border border-border text-xs text-muted-foreground space-y-1">
            <span className="font-semibold block text-foreground">💡 ข้อแนะนำระบบบัญชีควบคุม:</span>
            <p>1. ระบบดึงปริมาณคงเหลือและคำนวณราคาเฉลี่ยถ่วงน้ำหนัก (Weighted Average Price) จากธุรกรรมจริง</p>
            <p className="mt-1">2. หลังจากนำส่งรายงานประจำเดือนแล้ว ระบบจะทำการล็อกข้อมูลคลังของช่วงเวลานั้น ไม่ให้มีการเพิ่ม/ลบรายการอีกต่อไป</p>
          </div>
        </div>

        {/* Right: Reports Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground">ร่างและประวัติรายงาน สกกร. นำส่งรัฐ</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            {reportsData?.data?.length === 0 ? (
              <div className="md:col-span-2 rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
                ไม่พบประวัติการทำรายงานประจำเดือนในระบบ กรุณาเลือกคลังและเริ่มประมวลผล
              </div>
            ) : (
              reportsData?.data?.map((r: any) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base">ประจำเดือน {r.reportMonth} / {r.reportYear}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                      r.statusId === 1 
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    }`}>
                      {r.statusName}
                    </span>
                  </div>

                  <div className="text-xs space-y-2 border-y border-border/50 py-3 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>สินค้าควบคุม:</span>
                      <span className="font-semibold text-foreground">{r.productName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>คลังควบคุม:</span>
                      <span className="font-semibold text-foreground truncate max-w-xs">{r.storageName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ยอดรับซื้อสะสม:</span>
                      <span className="font-semibold text-foreground">{Number(r.totalPurchaseQty).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ราคาซื้อเฉลี่ยถ่วงน้ำหนัก:</span>
                      <span className="font-semibold text-foreground">{Number(r.avgPurchasePrice).toLocaleString()} บาท</span>
                    </div>
                    <div className="flex justify-between border-t border-border/30 pt-1">
                      <span>คงเหลือยกไป (Ending):</span>
                      <span className="font-semibold text-foreground text-sm">{Number(r.endingBalanceQty).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {r.statusId === 1 ? (
                      <Button
                        onClick={() => {
                          confirm({
                            title: "ยืนยันการนำส่งรายงานประจำเดือน",
                            description: "คุณยืนยันที่จะนำส่งรายงานนี้ให้กับภาครัฐใช่หรือไม่? หลังจากส่งแล้วจะไม่สามารถแก้ไขข้อมูลย้อนหลังในรอบเดือนนี้ได้อีก",
                            onConfirm: () => submitReportMutation.mutate(r.id)
                          });
                        }}
                        className="w-full h-9 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors cursor-pointer flex items-center justify-center"
                      >
                        ยืนยันและนำส่งรายงาน
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-[10px] text-muted-foreground text-center space-y-0.5 bg-muted/30 py-2 rounded-lg border border-border/40">
                          <span className="font-medium text-foreground block">
                            {r.statusId === 3 ? "✓ ตรวจสอบรับรองแล้ว" : "✓ ยื่นส่งข้อมูลเรียบร้อย"}
                          </span>
                          {r.submittedAt && <span>ประทับเวลาระบบราชการ: {new Date(r.submittedAt).toLocaleString("th-TH")}</span>}
                        </div>
                        {r.statusId === 2 && (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              confirm({
                                title: "ยืนยันการดึงรายงานกลับมาเป็นแบบร่าง",
                                description: "คุณยืนยันที่จะดึงรายงานนี้กลับใช่หรือไม่? การกระทำนี้จะปลดล็อกข้อมูลคลังประจำช่วงเวลานี้ชั่วคราว เพื่อให้คุณสามารถ เพิ่ม/แก้ไข/ลบ รายการบันทึกบัญชีสินค้าสะสมได้อีกครั้ง",
                                onConfirm: () => revertReportMutation.mutate(r.id)
                              });
                            }}
                            className="w-full h-8 text-[11px] font-semibold border border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive/10 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                          >
                            ↩️ ดึงรายงานกลับมาแก้ไข
                          </Button>
                        )}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewReportId(r.id)}
                      className="w-full text-xs font-semibold h-9 cursor-pointer flex items-center justify-center gap-1 border-primary/30 text-primary hover:bg-primary/5"
                    >
                      📄 ดูและพิมพ์แบบ มพอ. ๐๑
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
    {previewReportId && (
      <PdfReportViewer
        report={(reportsData as any)?.data?.find((x: any) => x.id === previewReportId) || null}
        userFullName={userFullName}
        open={!!previewReportId}
        onOpenChange={(v: any) => { if (!v) setPreviewReportId(null); }}
      />
    )}
  </>
  );
}
