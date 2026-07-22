import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  TrendingUp,
  TrendingDown,
  Package,
  Calendar,
  FileCheck,
  Building2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import dayjs from "dayjs";
import "dayjs/locale/th";
import { sumDecimals, subDecimals, formatDecimalString } from "../lib/decimal.ts";
import { StockTransaction, MonthlyReport, StorageLocation, Product } from "../types/index.ts";
import { useNavigate } from "react-router-dom";

dayjs.locale("th");

export function DashboardPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = React.useState<"daily" | "monthly" | "yearly">("daily");

  // Fetch Stock Transactions
  const { data: txsData, isLoading: loadingTxs } = useQuery<{ success: boolean; data: StockTransaction[] }>({
    queryKey: ["stock-transactions"],
    queryFn: () => api.get("/stock"),
  });

  // Fetch Monthly Reports
  const { data: reportsData } = useQuery<{ success: boolean; data: MonthlyReport[] }>({
    queryKey: ["monthly-reports"],
    queryFn: () => api.get("/reports"),
  });

  // Fetch Storage Locations
  const { data: storageData } = useQuery<{ success: boolean; data: StorageLocation[] }>({
    queryKey: ["storage"],
    queryFn: () => api.get("/storage"),
  });

  // Fetch Products
  const { data: productsData } = useQuery<{ success: boolean; data: Product[] }>({
    queryKey: ["products"],
    queryFn: () => api.get("/products"),
  });

  const allTxs = txsData?.data || [];
  const allReports = reportsData?.data || [];
  const allStorages = storageData?.data || [];
  const allProducts = productsData?.data || [];

  // Maps for quick lookup
  const productMap = React.useMemo(() => {
    const map = new Map<string, string>();
    allProducts.forEach((p) => map.set(String(p.id), p.name));
    return map;
  }, [allProducts]);

  const storageMap = React.useMemo(() => {
    const map = new Map<string, string>();
    allStorages.forEach((s) => map.set(String(s.id), s.name));
    return map;
  }, [allStorages]);

  // Calculate Key KPI Totals
  const totalPurchase = React.useMemo(() => {
    const purchaseTxs = allTxs.filter((tx) => tx.transactionTypeId === 1);
    return sumDecimals(purchaseTxs, (tx) => tx.quantity);
  }, [allTxs]);

  const totalSales = React.useMemo(() => {
    const salesTxs = allTxs.filter((tx) => tx.transactionTypeId === 2);
    return sumDecimals(salesTxs, (tx) => tx.quantity);
  }, [allTxs]);

  const currentBalance = React.useMemo(() => {
    return subDecimals(totalPurchase, totalSales);
  }, [totalPurchase, totalSales]);

  // Deadline Countdown (5th of next month)
  const deadlineInfo = React.useMemo(() => {
    const today = dayjs();
    let deadline = today.endOf("month").add(5, "day");
    if (today.date() <= 5) {
      deadline = today.date(5);
    }
    const diffDays = deadline.diff(today, "day");
    return {
      deadlineDateStr: deadline.format("D MMM YYYY"),
      daysLeft: diffDays >= 0 ? diffDays : 0,
    };
  }, []);

  const reportStatus = React.useMemo(() => {
    if (allReports.length === 0) return { label: "ไม่มีร่างรายงาน", isSubmitted: false };
    const latest = allReports[0];
    return {
      label: latest.statusId === 1 ? "มีร่างรายงาน (Draft)" : "ยื่นส่งแล้ว (Submitted)",
      isSubmitted: latest.statusId === 2,
    };
  }, [allReports]);

  // Aggregate Data for Main Trend Chart (Daily / Monthly / Yearly)
  const chartData = React.useMemo(() => {
    if (allTxs.length === 0) return [];

    const grouped: Record<string, { label: string; inbound: number; outbound: number }> = {};

    const sorted = [...allTxs].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    sorted.forEach((tx) => {
      const d = dayjs(tx.createdAt || Date.now());
      let key = "";
      let label = "";

      if (timeRange === "daily") {
        key = d.format("YYYY-MM-DD");
        label = d.format("DD/MM");
      } else if (timeRange === "monthly") {
        key = d.format("YYYY-MM");
        label = d.format("MMM YY");
      } else {
        key = d.format("YYYY");
        label = d.format("YYYY");
      }

      if (!grouped[key]) {
        grouped[key] = { label, inbound: 0, outbound: 0 };
      }

      const qty = parseFloat(tx.quantity || "0");
      if (tx.transactionTypeId === 1) {
        grouped[key].inbound += qty;
      } else if (tx.transactionTypeId === 2) {
        grouped[key].outbound += qty;
      }
    });

    return Object.values(grouped);
  }, [allTxs, timeRange]);

  // Product Distribution Data for Donut Chart
  const productPieData = React.useMemo(() => {
    const grouped: Record<string, number> = {};
    allTxs.forEach((tx) => {
      const pName = tx.productName || productMap.get(String(tx.productId)) || "มะพร้าวผลแก่";
      const qty = parseFloat(tx.quantity || "0");
      grouped[pName] = (grouped[pName] || 0) + qty;
    });

    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];
    return Object.keys(grouped).map((name, idx) => ({
      name,
      value: grouped[name],
      color: colors[idx % colors.length],
    }));
  }, [allTxs, productMap]);

  // Recent 5 Transactions
  const recentTransactions = React.useMemo(() => {
    return [...allTxs]
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [allTxs]);

  return (
    <Card className="h-[calc(100vh-5.5rem)] flex flex-col border-border/60 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden p-0">
      {/* Top Header & Quick Actions */}
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40 shrink-0 px-6 pt-5">
        <div>
          <CardTitle className="text-2xl font-extrabold tracking-tight">แดชบอร์ดสรุปยอดสต๊อก</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            สถิติและภาพรวมความเคลื่อนไหวสินค้าคุมตามกฎหมายกรมการค้าภายใน (สพภ. 01 / 02)
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate("/stock")}
            className="font-bold text-xs h-9 cursor-pointer gap-1.5"
          >
            <Package className="h-4 w-4" /> บันทึกรายการประจำวัน
          </Button>
          <Button
            onClick={() => navigate("/reports")}
            variant="outline"
            className="font-bold text-xs h-9 cursor-pointer gap-1.5"
          >
            <FileCheck className="h-4 w-4 text-emerald-500" /> ส่งรายงานราชการ
          </Button>
        </div>
      </CardHeader>

      {/* Main Scrollable Area using shadcn ScrollArea */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-6 py-5">
          <div className="space-y-6 pb-6">
            {/* KPI Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* KPI 1: Net Inventory Balance */}
              <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm relative overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardDescription className="text-xs font-semibold text-muted-foreground">
                    ยอดสินค้าคงเหลือสุทธิปัจจุบัน
                  </CardDescription>
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Package className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black tracking-tight text-foreground">
                    {formatDecimalString(currentBalance, 0)} <span className="text-xs font-normal text-muted-foreground">ลูก</span>
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                    <ArrowUpRight className="h-3.5 w-3.5" /> สต๊อกพร้อมรองรับการรายงาน
                  </p>
                </CardContent>
              </Card>

              {/* KPI 2: Total Inbound */}
              <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm relative overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardDescription className="text-xs font-semibold text-muted-foreground">
                    ยอดรับซื้อสะสมรวม
                  </CardDescription>
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black tracking-tight text-foreground">
                    {formatDecimalString(totalPurchase, 0)} <span className="text-xs font-normal text-muted-foreground">ลูก</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                    <span>ธุรกรรมรับเข้าคลังสะสม</span>
                  </p>
                </CardContent>
              </Card>

              {/* KPI 3: Total Outbound */}
              <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm relative overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardDescription className="text-xs font-semibold text-muted-foreground">
                    ยอดจำหน่าย/แปรรูปสะสมรวม
                  </CardDescription>
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black tracking-tight text-foreground">
                    {formatDecimalString(totalSales, 0)} <span className="text-xs font-normal text-muted-foreground">ลูก</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                    <span>ระบายออกและแปรรูป</span>
                  </p>
                </CardContent>
              </Card>

              {/* KPI 4: Report Deadline Status */}
              <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm relative overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardDescription className="text-xs font-semibold text-muted-foreground">
                    กำหนดส่งรายงาน สพภ.01/02
                  </CardDescription>
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                    <Calendar className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">{reportStatus.label}</span>
                    <Badge variant={reportStatus.isSubmitted ? "default" : "outline"} className={reportStatus.isSubmitted ? "bg-emerald-600 text-xs" : "text-amber-500 border-amber-500/40 text-xs"}>
                      {reportStatus.isSubmitted ? "ส่งแล้ว" : `เหลือ ${deadlineInfo.daysLeft} วัน`}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    กำหนดส่งกรมฯ ภายในวันที่ 5 ของเดือน
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Interactive Analytics Section */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left 2 Cols: Main Stock Trend Chart */}
              <Card className="lg:col-span-2 border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base font-extrabold">เเนวโน้มความเคลื่อนไหวสต๊อก (Inbound vs Outbound)</CardTitle>
                    <CardDescription className="text-xs">
                      วิเคราะห์การรับซื้อและการจำหน่ายมะพร้าวในช่วงเวลาที่กำหนด
                    </CardDescription>
                  </div>
                  {/* Time Range Selector Switch */}
                  <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
                    <button
                      type="button"
                      onClick={() => setTimeRange("daily")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        timeRange === "daily" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      รายวัน
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeRange("monthly")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        timeRange === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      รายเดือน
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeRange("yearly")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        timeRange === "yearly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      รายปี
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {loadingTxs ? (
                    <div className="h-72 flex items-center justify-center text-xs text-muted-foreground">
                      กำลังโหลดข้อมูลความเคลื่อนไหว...
                    </div>
                  ) : chartData.length > 0 ? (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "12px" }}
                            formatter={(val: any) => [`${formatDecimalString(val.toString(), 0)} ลูก`, ""]}
                          />
                          <Legend wrapperStyle={{ fontSize: "12px" }} />
                          <Area type="monotone" dataKey="inbound" name="รับซื้อ (Inbound)" stroke="#10b981" fillOpacity={1} fill="url(#colorInbound)" strokeWidth={2} />
                          <Area type="monotone" dataKey="outbound" name="จำหน่าย/แปรรูป (Outbound)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOutbound)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-72 flex flex-col items-center justify-center text-xs text-muted-foreground border rounded-lg bg-muted/20">
                      <Package className="h-8 w-8 mb-2 opacity-40" />
                      <span>ยังไม่มีข้อมูลการบันทึกรายการประจำวัน</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right 1 Col: Product Ratio Donut Chart */}
              <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-extrabold">สัดส่วนสินค้าในสต๊อก</CardTitle>
                  <CardDescription className="text-xs">
                    การกระจายตัวของประเภทสินค้าตามสัดส่วนปริมาณ
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center items-center">
                  {productPieData.length > 0 ? (
                    <>
                      <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={productPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {productPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "12px" }}
                              formatter={(val: any) => [`${formatDecimalString(val.toString(), 0)} ลูก`, ""]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full space-y-1.5 pt-2">
                        {productPieData.map((item) => (
                          <div key={item.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="truncate font-medium">{item.name}</span>
                            </div>
                            <span className="font-bold text-muted-foreground">{formatDecimalString(item.value.toString(), 0)} ลูก</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-52 flex flex-col items-center justify-center text-xs text-muted-foreground">
                      <span>ไม่มีข้อมูลประเภทสินค้า</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Storage Breakdown & Recent Activity Section */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Storage Locations Overview */}
              <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base font-extrabold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" /> คลังสินค้าทั้งหมด
                    </CardTitle>
                    <CardDescription className="text-xs">คลังสินค้าและจุดจัดเก็บวัตถุดิบในระบบ</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/storage")} className="h-7 text-xs font-semibold gap-1 text-primary cursor-pointer">
                    ดูทั้งหมด <ChevronRight className="h-3 w-3" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {allStorages.length > 0 ? (
                    allStorages
                      .filter((s) => s.name !== "ส่งมอบโดยตรง (ไม่ผ่านคลัง)")
                      .slice(0, 4)
                      .map((loc) => (
                        <div key={loc.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded bg-background border shrink-0">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{loc.name}</p>
                              <p className="text-[10px] text-muted-foreground">ที่อยู่: {loc.address || "คลังหลัก"}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-semibold shrink-0">
                            ใช้งานปกติ
                          </Badge>
                        </div>
                      ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-4 text-center">ไม่มีข้อมูลคลังสินค้า</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Transactions List */}
              <Card className="lg:col-span-2 border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base font-extrabold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" /> รายการความเคลื่อนไหวล่าสุด
                    </CardTitle>
                    <CardDescription className="text-xs">รายการรับเข้าและจำหน่ายสินค้า 5 รายการล่าสุด</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/stock")} className="h-7 text-xs font-semibold gap-1 text-primary cursor-pointer">
                    ดูทั้งหมด <ChevronRight className="h-3 w-3" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {recentTransactions.length > 0 ? (
                    <div className="space-y-2">
                      {recentTransactions.map((tx) => {
                        const isInbound = tx.transactionTypeId === 1;
                        const productName = tx.productName || productMap.get(String(tx.productId)) || "มะพร้าวผลแก่";
                        const storageName = tx.storageName || (tx.storageId ? storageMap.get(String(tx.storageId)) : "") || "คลังหลัก";
                        return (
                          <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-background/60">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${isInbound ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"}`}>
                                {isInbound ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold">{productName}</span>
                                  <Badge variant="outline" className={`text-[10px] ${isInbound ? "text-emerald-600 border-emerald-500/30" : "text-blue-600 border-blue-500/30"}`}>
                                    {isInbound ? "รับซื้อเข้าคลัง" : "จำหน่าย/แปรรูป"}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {dayjs(tx.createdAt).format("DD/MM/YYYY HH:mm")} น. | คลัง: {storageName}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-black ${isInbound ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"}`}>
                                {isInbound ? "+" : "-"}{formatDecimalString(tx.quantity, 0)} ลูก
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-8 text-center">ยังไม่มีประวัติการบันทึกความเคลื่อนไหว</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default DashboardPage;
