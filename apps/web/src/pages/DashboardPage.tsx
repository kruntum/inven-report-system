import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Check } from "lucide-react";

export function DashboardPage() {
  const { data: txsData } = useQuery({
    queryKey: ["stock-transactions"],
    queryFn: () => api.get("/stock")
  });

  const { data: reportsData } = useQuery({
    queryKey: ["monthly-reports"],
    queryFn: () => api.get("/reports")
  });

  const totalPurchase = React.useMemo(() => {
    if (!txsData?.data) return "0";
    return txsData.data
      .filter((tx: any) => tx.transactionTypeId === 1) // รับซื้อ
      .reduce((sum: number, tx: any) => sum + Number(tx.quantity), 0)
      .toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }, [txsData]);

  const totalSales = React.useMemo(() => {
    if (!txsData?.data) return "0";
    return txsData.data
      .filter((tx: any) => tx.transactionTypeId === 2) // จำหน่าย
      .reduce((sum: number, tx: any) => sum + Number(tx.quantity), 0)
      .toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }, [txsData]);

  const reportStatus = React.useMemo(() => {
    if (!reportsData?.data || reportsData.data.length === 0) return "ไม่มีข้อมูลร่าง";
    const latest = reportsData.data[0];
    return latest.statusId === 1 ? "มีร่างรายงาน (Draft)" : "นำส่งแล้ว (Submitted)";
  }, [reportsData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">แดชบอร์ดสรุปยอด</h1>
        <p className="text-muted-foreground text-sm">ภาพรวมความเคลื่อนไขคลังและประวัติการรายงานส่งหน่วยงานภาครัฐ</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ปริมาณรับซื้อมะพร้าวผลอ่อนสะสม (ลูก)</CardDescription>
            <CardTitle className="text-3xl">{totalPurchase} ลูก</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" />
              <span>เกณฑ์รายงาน สกกร. ทำงานอยู่</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ปริมาณจำหน่ายมะพร้าวผลอ่อนสะสม (ลูก)</CardDescription>
            <CardTitle className="text-3xl">{totalSales} ลูก</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">กรองธุรกรรมที่ยังไม่ถูกลบสะสม</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>สถานะร่างรายงานประจำเดือนปัจจุบัน</CardDescription>
            <CardTitle className="text-3xl">{reportStatus}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">ยื่นส่งข้อมูลภายในวันที่ 5 ของเดือนถัดไป</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics chart panel */}
      <Card>
        <CardHeader>
          <CardTitle>แนวโน้มความเคลื่อนไหวคลังรายวัน</CardTitle>
          <CardDescription>ข้อมูลคำนวณผ่าน API และถ่วงน้ำหนักโดยเฉลี่ย</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full rounded-lg bg-muted/40 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">แผนภูมิแสดงผลความเคลื่อนไหวของคลังมะพร้าว</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
