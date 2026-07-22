import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Loader2, ClipboardList, PackageCheck, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { MonthlyReport } from "../../types/index.ts";
import { formatDate } from "../../lib/dayjs.ts";
import { formatDecimalString } from "../../lib/decimal.ts";

interface StockLedgerDialogProps {
  report: MonthlyReport | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const getMonthNameThai = (m: number) =>
  ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
   "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"][m - 1] ?? "";

function getLastDayOfMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function StockLedgerDialog({ report, isOpen, onOpenChange }: StockLedgerDialogProps) {
  if (!report) return null;

  const lastDay = getLastDayOfMonth(report.reportMonth, report.reportYear);
  const startDate = `${report.reportYear}-${String(report.reportMonth).padStart(2, "0")}-01`;
  const endDate = `${report.reportYear}-${String(report.reportMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Query actual transactions for this product in the given month range
  const { data: txsRes, isLoading } = useQuery<any>({
    queryKey: ["stock-transactions", "ledger", report.productId, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("startDate", startDate);
      params.set("endDate", endDate);
      params.set("productId", report.productId);
      return api.get(`/stock?${params.toString()}`);
    },
    enabled: isOpen,
  });

  // Calculate chronological ledger rows
  const ledgerRows = React.useMemo(() => {
    if (!txsRes?.data) return [];
    
    // Sort transactions chronologically (from oldest to newest)
    const sortedTxs = [...txsRes.data].reverse();
    
    // Initial beginning balance calculation (same logic as in Excel generation)
    let currentBalance = Number(report.endingBalanceQty || 0) - 
                         Number(report.totalPurchaseQty || 0) + 
                         Number(report.totalSalesQty || 0) + 
                         Number(report.totalUsageQty || 0);
                         
    return sortedTxs.map((tx: any) => {
      const qty = Number(tx.quantity);
      const price = tx.unitPrice ? Number(tx.unitPrice) : null;
      const prevBalance = currentBalance;

      let purchaseQty: number | null = null;
      let purchasePartner: string | null = null;
      let purchasePrice: number | null = null;
      let usageType: string | null = null;
      let usageQty: number | null = null;
      let domesticPrice: number | null = null;
      let exportPrice: number | null = null;

      if (tx.transactionTypeId === 1) { // รับซื้อ
        purchaseQty = qty;
        purchasePrice = price;
        currentBalance += qty;
        
        let partnerText = tx.partnerName || "ไม่ระบุคู่ค้า";
        if (tx.sourcePartnerName) {
          partnerText += ` (จากโรงงาน: ${tx.sourcePartnerName})`;
        }
        purchasePartner = partnerText;
      } else if (tx.transactionTypeId === 2) { // จำหน่าย
        usageQty = qty;
        currentBalance -= qty;

        if (tx.saleType === "export") {
          exportPrice = price;
          usageType = tx.productionType || "ส่งออกต่างประเทศ";
          if (tx.destinationCountry) {
            usageType += ` (${tx.destinationCountry})`;
          }
        } else {
          domesticPrice = price;
          usageType = tx.productionType || "จำหน่ายในประเทศ";
          if (tx.partnerName) {
            usageType += ` (${tx.partnerName})`;
          }
        }
      } else if (tx.transactionTypeId === 3) { // ใช้ผลิต
        usageQty = qty;
        currentBalance -= qty;
        usageType = tx.productionType || "ใช้ผลิตในโรงงาน";
      } else if (tx.transactionTypeId === 4) { // ปรับปรุงยอด
        purchaseQty = qty;
        currentBalance += qty;
        purchasePartner = "ปรับปรุงยอดคลังสินค้า";
      }

      return {
        id: tx.id,
        date: tx.transactionDate,
        typeName: tx.transactionTypeName,
        typeId: tx.transactionTypeId,
        beginningBalance: prevBalance,
        purchaseQty,
        purchasePartner,
        purchasePrice,
        usageType,
        usageQty,
        domesticPrice,
        exportPrice,
        endingBalance: currentBalance,
        invoiceNo: tx.invoiceNo,
        containerNo: tx.containerNo,
        remarks: tx.remarks,
      };
    });
  }, [txsRes, report]);

  // Calculate summary metrics for footer
  const totalPurchaseQty = Number(report.totalPurchaseQty || 0);
  const totalOutboundQty = Number(report.totalSalesQty || 0) + Number(report.totalUsageQty || 0);
  const endingBalanceQty = Number(report.endingBalanceQty || 0);
  const beginningBalanceQty = endingBalanceQty - totalPurchaseQty + totalOutboundQty;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[88vh] p-0 flex flex-col overflow-hidden border-border bg-background shadow-xl">
        {/* Top Header */}
        <div className="p-5 pb-3 border-b border-border/40 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span>รายละเอียดบัญชีคุมสต๊อกรายรายการ</span>
              <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                {getMonthNameThai(report.reportMonth)} {report.reportYear + 543}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              แสดงการคำนวณตัดสต๊อกและยอดยกมาสะสมรายวันของสินค้า: <strong className="text-foreground">{report.productName}</strong>
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-hidden p-5 pb-3 flex flex-col min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">กำลังประมวลผลข้อมูลการตัดสต๊อก...</span>
            </div>
          ) : ledgerRows.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm border rounded-lg border-dashed">
              ไม่พบรายการซื้อขายของสินค้านี้ในเดือนที่เลือก
            </div>
          ) : (
            <div className="border border-border/60 rounded-md flex-1 min-h-0 relative flex flex-col overflow-hidden bg-background/40">
              {/* 1. FIXED HEADER CONTAINER (Outside ScrollArea) */}
              <div className="bg-card z-20 border-b border-border/40 shrink-0 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30 border-0">
                      <TableHead className="w-[100px] text-xs font-extrabold text-center h-10 border-0">วันที่ทำรายการ</TableHead>
                      <TableHead className="w-[85px] text-xs font-extrabold text-center h-10 border-0">ประเภท</TableHead>
                      <TableHead className="w-[100px] text-xs font-extrabold text-right h-10 border-0">ยอดยกมา</TableHead>
                      <TableHead className="w-[110px] text-xs font-extrabold text-right h-10 border-0">ปริมาณรับเข้า</TableHead>
                      <TableHead className="w-[150px] text-xs font-extrabold h-10 border-0">รับเข้าจาก / อินวอยซ์</TableHead>
                      <TableHead className="w-[100px] text-xs font-extrabold text-right h-10 border-0">ราคารับซื้อ</TableHead>
                      <TableHead className="w-[110px] text-xs font-extrabold text-right h-10 border-0">ปริมาณจำหน่าย</TableHead>
                      <TableHead className="w-[150px] text-xs font-extrabold h-10 border-0">รูปแบบการจำหน่าย / ผลิต</TableHead>
                      <TableHead className="w-[100px] text-xs font-extrabold text-right h-10 border-0">ราคาจำหน่าย</TableHead>
                      <TableHead className="w-[100px] text-xs font-extrabold text-right h-10 border-0">คงเหลือยกไป</TableHead>
                      <TableHead className="w-[130px] text-xs font-extrabold h-10 border-0">หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
              </div>

              {/* 2. SCROLLABLE BODY CONTAINER (Inside ScrollArea Only) */}
              <div className="flex-1 min-h-0 relative overflow-hidden">
                <ScrollArea className="h-full w-full">
                  <Table>
                    <TableBody>
                      {ledgerRows.map((row) => {
                        const badgeColor = ({
                          1: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                          2: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
                          3: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
                          4: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        } as Record<number, string>)[row.typeId] || "";

                        return (
                          <TableRow key={row.id} className="hover:bg-muted/30 text-xs border-b border-border/40">
                            <TableCell className="w-[100px] text-center whitespace-nowrap font-medium text-muted-foreground py-2.5">
                              {formatDate(row.date)}
                            </TableCell>
                            <TableCell className="w-[85px] text-center whitespace-nowrap py-2.5">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${badgeColor}`}>
                                {row.typeName}
                              </Badge>
                            </TableCell>
                            <TableCell className="w-[100px] text-right font-medium text-muted-foreground py-2.5">
                              {formatDecimalString(row.beginningBalance, 0)}
                            </TableCell>
                            <TableCell className="w-[110px] text-right font-bold text-emerald-600 dark:text-emerald-400 py-2.5">
                              {row.purchaseQty !== null ? `+${formatDecimalString(row.purchaseQty, 0)}` : "-"}
                            </TableCell>
                            <TableCell className="w-[150px] max-w-[150px] truncate py-2.5" title={row.purchasePartner || ""}>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{row.purchasePartner || "-"}</span>
                                {row.invoiceNo && (
                                  <span className="text-[10px] text-muted-foreground font-mono">INV: {row.invoiceNo}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="w-[100px] text-right text-foreground py-2.5">
                              {row.purchasePrice !== null ? `${formatDecimalString(row.purchasePrice, 2)}` : "-"}
                            </TableCell>
                            <TableCell className="w-[110px] text-right font-bold text-blue-600 dark:text-blue-400 py-2.5">
                              {row.usageQty !== null ? `-${formatDecimalString(row.usageQty, 0)}` : "-"}
                            </TableCell>
                            <TableCell className="w-[150px] max-w-[150px] truncate py-2.5" title={row.usageType || ""}>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{row.usageType || "-"}</span>
                                {row.invoiceNo && row.typeId === 2 && (
                                  <span className="text-[10px] text-muted-foreground font-mono">INV: {row.invoiceNo}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="w-[100px] text-right text-foreground py-2.5">
                              {row.domesticPrice !== null && `${formatDecimalString(row.domesticPrice, 2)}`}
                              {row.exportPrice !== null && `${formatDecimalString(row.exportPrice, 2)}`}
                              {row.domesticPrice === null && row.exportPrice === null && "-"}
                            </TableCell>
                            <TableCell className="w-[100px] text-right font-extrabold text-foreground bg-muted/20 py-2.5">
                              {formatDecimalString(row.endingBalance, 0)}
                            </TableCell>
                            <TableCell className="w-[130px] max-w-[130px] truncate text-muted-foreground py-2.5" title={row.remarks || ""}>
                              <div className="flex flex-col gap-0.5">
                                <span>{row.remarks || "-"}</span>
                                {row.containerNo && (
                                  <span className="text-[10px] text-primary font-semibold">ตู้: {row.containerNo}</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        {/* 3. FIXED SUMMARY FOOTER CONTAINER (Always Visible at Bottom) */}
        {!isLoading && ledgerRows.length > 0 && (
          <div className="bg-card z-20 border-t border-border/40 shrink-0 p-3 px-5 bg-muted/30">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground font-bold">
                <PackageCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>สรุปผลรวมสต๊อกประจำเดือน ({ledgerRows.length} รายการธุรกรรม)</span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Beginning Balance */}
                <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-md border border-border/60 shadow-2xs">
                  <span className="text-[11px] text-muted-foreground font-medium">ยอดยกมา:</span>
                  <span className="font-extrabold text-foreground">{formatDecimalString(beginningBalanceQty, 0)}</span>
                </div>

                {/* Total Inbound */}
                <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-md border border-emerald-500/30">
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">+ รับซื้อสะสม:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">+{formatDecimalString(totalPurchaseQty, 0)}</span>
                </div>

                {/* Total Outbound */}
                <div className="flex items-center gap-1.5 bg-blue-500/10 px-3 py-1.5 rounded-md border border-blue-500/30">
                  <ArrowDownRight className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">- จ่ายออกสะสม:</span>
                  <span className="font-extrabold text-blue-600 dark:text-blue-400">-{formatDecimalString(totalOutboundQty, 0)}</span>
                </div>

                {/* Ending Balance Net */}
                <div className="flex items-center gap-2 bg-emerald-600 text-white px-3.5 py-1.5 rounded-md shadow-xs font-bold">
                  <span className="text-[11px] opacity-90">คงเหลือยกไปสิ้นเดือน:</span>
                  <span className="text-sm font-black">{formatDecimalString(endingBalanceQty, 0)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
