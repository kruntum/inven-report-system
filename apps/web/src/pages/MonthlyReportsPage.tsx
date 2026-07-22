import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../lib/api.ts";
import { useConfirm } from "../store/useConfirm.ts";
import { PdfReportViewer } from "../components/PdfReportViewer.tsx";
import { useAppStore } from "../store/useAppStore.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Calendar, RefreshCw, Trash2, Loader2, Search, FileText, FileSpreadsheet, Send } from "lucide-react";
import { toast } from "sonner";
import { generateReportFormSchema } from "../schemas/index.ts";
import { MonthlyReport, Product } from "../types/index.ts";
import { DataTable } from "../components/shared/data-table.tsx";
import { StockLedgerDialog } from "../components/stock/StockLedgerDialog.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

type GenerateReportFormValues = z.infer<typeof generateReportFormSchema>;

const getMonthNameThai = (m: number) =>
  ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
   "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"][m - 1] ?? "";

export function MonthlyReportsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm((state) => state.confirm);
  const [previewReportId, setPreviewReportId] = React.useState<string | null>(null);
  const [selectedLedgerReport, setSelectedLedgerReport] = React.useState<MonthlyReport | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [exportingId, setExportingId] = React.useState<string | null>(null);
  
  // Safe extraction of current user fullName
  const userFullName: string = (queryClient.getQueryData<any>(["user"])?.fullName || "").replace(" (ผู้ดูแลระบบ)", "") || "สมชาย ยอดมะพร้าว";

  const { data: productsData } = useQuery<{ success: boolean; data: Product[] }>({
    queryKey: ["products"],
    queryFn: () => api.get("/products")
  });

  const { data: reportsData } = useQuery<{ success: boolean; data: MonthlyReport[] }>({
    queryKey: ["monthly-reports"],
    queryFn: () => api.get("/reports")
  });

  const generateReportMutation = useMutation({
    mutationFn: (data: GenerateReportFormValues) => api.post("/reports/generate", data),
    onSuccess: () => {
      toast.success("ประมวลผลสรุปราคาเฉลี่ยและคงคลังยกไป (Draft) สำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
      setIsModalOpen(false); // Close dialog on success
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

  const deleteReportMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/reports/${id}`),
    onSuccess: () => {
      toast.success("ลบรายงานประจำเดือนสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการลบข้อมูล");
    }
  });

  const { handleSubmit, control, formState: { errors } } = useForm<GenerateReportFormValues>({
    resolver: zodResolver(generateReportFormSchema),
    defaultValues: {
      reportMonth: new Date().getMonth() + 1,
      reportYear: new Date().getFullYear()
    }
  });

  const onSubmit = (data: GenerateReportFormValues) => {
    generateReportMutation.mutate(data);
  };

  const handleRecalculate = (item: MonthlyReport) => {
    generateReportMutation.mutate({
      reportMonth: item.reportMonth,
      reportYear: item.reportYear,
      productId: item.productId,
      storageId: item.storageId || undefined,
    });
  };

  const handleExportExcel = async (item: MonthlyReport) => {
    setExportingId(item.id);
    try {
      const token = useAppStore.getState().token;
      
      const response = await fetch(`/api/reports/${item.id}/excel?t=${Date.now()}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const contentType = response.headers.get("Content-Type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await response.json();
          throw new Error(errData.message || errData.error || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
        }
        throw new Error("ดาวน์โหลดไฟล์ Excel ล้มเหลว");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `แบบ_มพอ_01_${item.productName}_${getMonthNameThai(item.reportMonth)}_${item.reportYear + 543}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("ส่งออกไฟล์ Excel สำเร็จ");
    } catch (err: any) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setExportingId(null);
    }
  };

  const columns = [
    {
      id: "period",
      header: "รอบรายงานประจำเดือน",
      cell: ({ row }: any) => {
        const item = row.original as MonthlyReport;
        return (
          <div className="flex flex-col">
            <span className="font-bold text-sm">
              {getMonthNameThai(item.reportMonth)} {item.reportYear + 543}
            </span>
            <span className="text-[10px] text-muted-foreground">
              ค.ศ. {item.reportMonth}/{item.reportYear}
            </span>
          </div>
        );
      }
    },
    {
      accessorKey: "productName",
      header: "สินค้าควบคุม",
      cell: ({ row }: any) => <span className="font-semibold text-foreground">{row.original.productName}</span>
    },
    {
      accessorKey: "statusName",
      header: "สถานะ",
      cell: ({ row }: any) => {
        const item = row.original as MonthlyReport;
        const colors = {
          1: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          2: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          3: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
        } as Record<number, string>;
        
        const labels = {
          1: "Draft (ร่าง)",
          2: "Submitted (นำส่งแล้ว)",
          3: "Approved (รับรองแล้ว)"
        } as Record<number, string>;

        return (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${colors[item.statusId] || ""}`}>
            {labels[item.statusId] || item.statusName}
          </span>
        );
      }
    },
    {
      id: "purchaseSummary",
      header: "ยอดรับซื้อสะสม / ราคาเฉลี่ย",
      cell: ({ row }: any) => {
        const item = row.original as MonthlyReport;
        return (
          <div className="flex flex-col text-xs">
            <span className="font-semibold text-foreground">
              {Number(item.totalPurchaseQty || 0).toLocaleString()} หน่วย
            </span>
            <span className="text-[10px] text-muted-foreground">
              @ {Number(item.avgPurchasePrice || 0).toLocaleString()} บาท/หน่วย
            </span>
          </div>
        );
      }
    },
    {
      id: "salesSummary",
      header: "ยอดจำหน่ายสะสม (ในประเทศ / ส่งออก)",
      cell: ({ row }: any) => {
        const item = row.original as MonthlyReport;
        const domesticQty = Number(item.totalSalesDomesticQty || 0);
        const exportQty = Number(item.totalSalesExportQty || 0);
        return (
          <div className="flex flex-col text-xs">
            <span className="font-medium text-foreground">
              ในประเทศ: {domesticQty.toLocaleString()} | ส่งออก: {exportQty.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground">
              รวม: {Number(item.totalSalesQty || 0).toLocaleString()} หน่วย
            </span>
          </div>
        );
      }
    },
    {
      accessorKey: "endingBalanceQty",
      header: "คงเหลือสิ้นเดือน (Ending)",
      cell: ({ row }: any) => (
        <span className="font-bold text-sm text-foreground">
          {Number(row.original.endingBalanceQty).toLocaleString()}
        </span>
      )
    },
    {
      id: "actions",
      header: "การจัดการรายงาน",
      cell: ({ row }: any) => {
        const item = row.original as MonthlyReport;
        return (
          <TooltipProvider delayDuration={100}>
            <div className="flex items-center gap-1">
              
              {/* 1. View Stock Ledger Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={() => setSelectedLedgerReport(item)}
                    className="h-8 w-8 bg-sky-600/5 hover:bg-sky-600/15 dark:bg-sky-400/10 dark:hover:bg-sky-400/20 text-sky-600 dark:text-sky-400 border border-sky-600/20 dark:border-sky-400/30 cursor-pointer transition-colors"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-semibold">ดูรายละเอียดบัญชีคุมสต๊อกรายรายการ</p>
                </TooltipContent>
              </Tooltip>

              {/* 2. PDF Preview Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={() => setPreviewReportId(item.id)}
                    className="h-8 w-8 bg-amber-600/5 hover:bg-amber-600/15 dark:bg-amber-400/10 dark:hover:bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-600/20 dark:border-amber-400/30 cursor-pointer transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-semibold">แสดงแบบรายงาน มพอ. ๐๑ (PDF)</p>
                </TooltipContent>
              </Tooltip>
              
              {/* 3. Export Excel Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={() => handleExportExcel(item)}
                    disabled={exportingId === item.id}
                    className="h-8 w-8 bg-emerald-600/5 hover:bg-emerald-600/15 dark:bg-emerald-400/10 dark:hover:bg-emerald-400/20 text-emerald-600 dark:text-emerald-400 border border-emerald-600/20 dark:border-emerald-400/30 cursor-pointer transition-colors"
                  >
                    {exportingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-semibold">ส่งออกรายงานไฟล์ Excel</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Status conditional actions */}
              {item.statusId === 1 ? (
                <>
                  {/* 4. Submit Report Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        onClick={() => {
                          confirm({
                            title: "ยืนยันการนำส่งรายงานประจำเดือน",
                            description: "คุณยืนยันที่จะนำส่งรายงานนี้ให้กับภาครัฐใช่หรือไม่? หลังจากส่งแล้วจะไม่สามารถแก้ไขข้อมูลย้อนหลังในรอบเดือนนี้ได้อีก",
                            onConfirm: () => submitReportMutation.mutate(item.id)
                          });
                        }}
                        className="h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-semibold">ยืนยันและนำส่งรายงานให้ราชการ</p>
                    </TooltipContent>
                  </Tooltip>
                  
                   {/* 5. Recalculate Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        onClick={() => {
                          confirm({
                            title: "ยืนยันการประมวลผลอัพเดทใหม่",
                            description: "คุณต้องการดึงข้อมูลธุรกรรมประจำช่วงเวลานี้มาคำนวณราคาเฉลี่ยและปริมาณสิ้นรอบสะสมใหม่อีกครั้งใช่หรือไม่?",
                            onConfirm: () => handleRecalculate(item)
                          });
                        }}
                        className="h-8 w-8 bg-indigo-600/5 hover:bg-indigo-600/15 dark:bg-indigo-400/10 dark:hover:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 border border-indigo-600/20 dark:border-indigo-400/30 cursor-pointer transition-colors"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-semibold">ประมวลผลคำนวณยอดอัพเดทใหม่</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* 6. Delete Draft Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        onClick={() => {
                          confirm({
                            title: "ยืนยันการลบรายงาน",
                            description: "คุณแน่ใจว่าต้องการลบข้อมูลสรุปรายงานร่างนี้ใช่หรือไม่? (การลบรายงานร่างนี้จะไม่ลบธุรกรรมประจำวันของคุณ)",
                            onConfirm: () => deleteReportMutation.mutate(item.id)
                          });
                        }}
                        className="h-8 w-8 bg-rose-600/5 hover:bg-rose-600/15 dark:bg-rose-400/10 dark:hover:bg-rose-400/20 text-rose-600 dark:text-rose-400 border border-rose-600/20 dark:border-rose-400/30 cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-semibold text-destructive">ลบรายงานร่างนี้</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap bg-muted px-1.5 py-0.5 rounded border border-border">
                    {item.statusId === 3 ? "✓ รับรองแล้ว" : "✓ ยื่นข้อมูลแล้ว"}
                  </span>
                  {item.statusId === 2 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            confirm({
                              title: "ยืนยันการดึงรายงานกลับมาเป็นแบบร่าง",
                              description: "คุณยืนยันที่จะดึงรายงานนี้กลับใช่หรือไม่? เพื่อปลดล็อกข้อมูลคลังประจำช่วงเวลานี้ชั่วคราวให้แก้ไขธุรกรรมได้",
                              onConfirm: () => revertReportMutation.mutate(item.id)
                            });
                          }}
                          className="h-8 text-[11px] border-destructive/20 text-destructive hover:bg-destructive/10 font-semibold cursor-pointer"
                        >
                          ↩️ ดึงกลับ
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs font-semibold">ดึงรายงานกลับมาเป็นแบบร่างเพื่อแก้ไขข้อมูล</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
          </TooltipProvider>
        );
      }
    }
  ];

  return (
    <Card className="h-[calc(100vh-5.5rem)] flex flex-col border-border/60 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden p-0">
      {/* Top Header */}
      <CardHeader className="pb-3 border-b border-border/40 shrink-0 px-6 pt-4">
        <CardTitle className="text-2xl font-extrabold tracking-tight">รายงาน สกกร. ประจำเดือน</CardTitle>
        <CardDescription className="text-xs mt-0.5">
          ประมวลผลคำนวณราคาซื้อเฉลี่ยถ่วงน้ำหนักและปริมาณสินค้าสะสมนำส่งกรมการค้าภายใน
        </CardDescription>
      </CardHeader>

      {/* Main Full-Height Content: DataTable Flex-1 with internal scroll */}
      <CardContent className="flex-1 overflow-hidden p-6 pt-4 flex flex-col min-h-0">
        <DataTable
          columns={columns}
          data={reportsData?.data || []}
          searchPlaceholder="ค้นหารายงานประจำเดือน..."
          action={
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="font-semibold cursor-pointer h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                  + ประมวลผลบัญชีคุมสินค้า
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] p-5">
                <DialogHeader className="pb-2">
                  <DialogTitle className="text-base font-extrabold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    ประมวลผลบัญชีคุมสินค้าประจำเดือน
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    เลือกเดือน ปี และสินค้าควบคุมที่ต้องการประมวลผลยอดสะสมเฉลี่ย
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">เดือน</Label>
                      <Controller
                        name="reportMonth"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                            <SelectTrigger className="cursor-pointer h-9">
                              <SelectValue placeholder="เลือกเดือน" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                <SelectItem key={m} value={m.toString()}>{getMonthNameThai(m)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.reportMonth && <span className="text-xs text-destructive">{errors.reportMonth.message}</span>}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">ปี พ.ศ.</Label>
                      <Controller
                        name="reportYear"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                            <SelectTrigger className="cursor-pointer h-9">
                              <SelectValue placeholder="เลือกปี" />
                            </SelectTrigger>
                            <SelectContent>
                              {[2024, 2025, 2026, 2027].map((y) => (
                                <SelectItem key={y} value={y.toString()}>{y + 543}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.reportYear && <span className="text-xs text-destructive">{errors.reportYear.message}</span>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">สินค้าควบคุม</Label>
                    <Controller
                      name="productId"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="cursor-pointer h-9">
                            <SelectValue placeholder="เลือกสินค้าคุม" />
                          </SelectTrigger>
                          <SelectContent>
                            {productsData?.data?.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.productId && <span className="text-xs text-destructive">{errors.productId.message}</span>}
                  </div>

                  <div className="rounded-lg bg-muted/60 p-3 border border-border text-[11px] text-muted-foreground space-y-1.5">
                    <span className="font-semibold block text-foreground text-xs">💡 ข้อแนะนำระบบบัญชีควบคุม:</span>
                    <p>1. ระบบจะดึงปริมาณคงเหลือและคำนวณราคาเฉลี่ยถ่วงน้ำหนัก (Weighted Average Price) จากธุรกรรมจริงตามรอบที่เลือก</p>
                    <p>2. หลังจากทำการนำส่งรายงานประจำเดือนแล้ว ระบบจะทำการล็อกข้อมูลคลังของช่วงเวลานั้น ไม่สามารถเพิ่ม/ลบ/แก้ไขธุรกรรมย้อนหลังได้อีก</p>
                  </div>

                  <Button
                    type="submit"
                    disabled={generateReportMutation.isPending}
                    className="w-full font-bold cursor-pointer h-10 mt-2"
                  >
                    {generateReportMutation.isPending ? "กำลังคำนวณ..." : "เริ่มประมวลผลสิ้นเดือน"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          }
        />
      </CardContent>

      {previewReportId && (
        <PdfReportViewer
          report={reportsData?.data?.find((x) => x.id === previewReportId) || null}
          userFullName={userFullName}
          open={!!previewReportId}
          onOpenChange={(v) => { if (!v) setPreviewReportId(null); }}
        />
      )}

      <StockLedgerDialog
        report={selectedLedgerReport}
        isOpen={!!selectedLedgerReport}
        onOpenChange={(v) => { if (!v) setSelectedLedgerReport(null); }}
      />
    </Card>
  );
}
export default MonthlyReportsPage;
