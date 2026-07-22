import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.ts";
import { useConfirm } from "../../store/useConfirm.ts";
import { DataTable } from "../shared/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { formatDate } from "../../lib/dayjs.ts";
import { toast } from "sonner";
import { StockTransaction } from "../../types/index.ts";
import { ActionCell } from "../shared/ActionCell.tsx";
import { formatDecimalString } from "../../lib/decimal.ts";

interface StockEntryTableProps {
  onEdit: (tx: StockTransaction) => void;
  onCopy: (tx: StockTransaction) => void;
  rightAction?: React.ReactNode;
}

const MONTHS = [
  { value: "all", label: "ทุกเดือน" },
  { value: "1", label: "มกราคม" },
  { value: "2", label: "กุมภาพันธ์" },
  { value: "3", label: "มีนาคม" },
  { value: "4", label: "เมษายน" },
  { value: "5", label: "พฤษภาคม" },
  { value: "6", label: "มิถุนายน" },
  { value: "7", label: "กรกฎาคม" },
  { value: "8", label: "สิงหาคม" },
  { value: "9", label: "กันยายน" },
  { value: "10", label: "ตุลาคม" },
  { value: "11", label: "พฤศจิกายน" },
  { value: "12", label: "ธันวาคม" },
];

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years: { value: string; label: string }[] = [{ value: "all", label: "ทุกปี" }];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push({ value: y.toString(), label: `${y} (${y + 543})` });
  }
  return years;
}

function computeDateRange(month: string, year: string) {
  if (year === "all") return { startDate: undefined, endDate: undefined };
  const y = parseInt(year);
  if (month === "all") {
    return {
      startDate: `${y}-01-01`,
      endDate: `${y}-12-31`,
    };
  }
  const m = parseInt(month);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    startDate: `${y}-${String(m).padStart(2, "0")}-01`,
    endDate: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function StockEntryTable({ onEdit, onCopy, rightAction }: StockEntryTableProps) {
  const queryClient = useQueryClient();
  const confirm = useConfirm((state) => state.confirm);

  const now = new Date();
  const [filterMonth, setFilterMonth] = React.useState<string>(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = React.useState<string>(String(now.getFullYear()));

  const { startDate, endDate } = computeDateRange(filterMonth, filterYear);

  const { data: transactionsData, isLoading } = useQuery<{ success: boolean; data: StockTransaction[] }>({
    queryKey: ["stock-transactions", startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const qs = params.toString();
      return api.get(`/stock${qs ? `?${qs}` : ""}`);
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

  const handleClearFilter = () => {
    setFilterMonth("all");
    setFilterYear("all");
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
        const item = row.original as StockTransaction;
        const mainName = item.partnerName;
        const sourceName = item.sourcePartnerName;
        const saleType = item.saleType;
        const country = item.destinationCountry;
        const invoiceNo = item.invoiceNo;
        const containerNo = item.containerNo;

        if (!mainName && !invoiceNo && !containerNo) return "-";
        
        let display = mainName || "";
        if (sourceName) {
          display += ` (ได้มาจากโรงงาน: ${sourceName})`;
        }
        if (saleType === "export" && country) {
          display += ` [ส่งออก: ${country}]`;
        } else if (saleType === "domestic") {
          display += " [ในประเทศ]";
        }

        return (
          <div className="flex flex-col gap-0.5">
            {display && <span className="text-xs font-semibold">{display}</span>}
            {(invoiceNo || containerNo) && (
              <span className="text-[11px] text-muted-foreground font-medium">
                {invoiceNo && `INV: ${invoiceNo}`}
                {invoiceNo && containerNo && " | "}
                {containerNo && `ตู้: ${containerNo}`}
              </span>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: "transactionTypeName",
      header: "ประเภท",
      cell: ({ row }: any) => {
        const item = row.original as StockTransaction;
        const typeId = item.transactionTypeId;
        const colors = {
          1: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          2: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
          3: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          4: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
        } as Record<number, string>;
        return (
          <Badge variant="outline" className={colors[typeId] || ""}>
            {item.transactionTypeName}
          </Badge>
        );
      }
    },
    {
      accessorKey: "quantity",
      header: "ปริมาณ / น้ำหนัก",
      cell: ({ row }: any) => {
        const item = row.original as StockTransaction;
        const qty = item.quantity;
        const unitName = item.unit || item.baseUnitName || "";
        const netWeight = item.netWeight;
        const grossWeight = item.grossWeight;
        
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold">
              {formatDecimalString(qty, 0)} {unitName}
            </span>
            {(netWeight !== null || grossWeight !== null) && (
              <span className="text-[11px] text-muted-foreground font-medium">
                {netWeight !== null && netWeight !== undefined && `เนื้อ: ${formatDecimalString(netWeight, 0)} กก.`}
                {netWeight !== null && netWeight !== undefined && grossWeight !== null && grossWeight !== undefined && " | "}
                {grossWeight !== null && grossWeight !== undefined && `รวมกล่อง: ${formatDecimalString(grossWeight, 0)} กก.`}
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
        const item = row.original as StockTransaction;
        if (!item.unitPrice) return "-";
        const price = item.unitPrice;
        const pricingType = item.pricingType;
        
        let label = "บาท/หน่วย";
        if (pricingType === "per_weight") {
          label = "บาท/กก.";
        } else if (pricingType === "per_unit" && item.baseUnitName) {
          label = `บาท/${item.baseUnitName}`;
        }
        
        return (
          <div className="flex flex-col">
            <span className="font-semibold">{formatDecimalString(price, 2)} บาท</span>
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        );
      }
    },
    {
      id: "actions",
      header: "จัดการ",
      cell: ({ row }: any) => {
        const item = row.original as StockTransaction;
        return (
          <ActionCell
            onEdit={() => onEdit(item)}
            onCopy={() => onCopy(item)}
            onDelete={() => {
              confirm({
                title: "ยืนยันการลบรายการธุรกรรม",
                description: "คุณแน่ใจว่าต้องการลบรายการธุรกรรมคลังสินค้านี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้",
                onConfirm: () => deleteTxMutation.mutate(item.id)
              });
            }}
          />
        );
      }
    }
  ];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-12">กำลังดึงข้อมูลธุรกรรมรายวัน...</p>;
  }

  const filterAction = (
    <div className="flex items-center gap-2">
      <Select value={filterMonth} onValueChange={setFilterMonth}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder="เดือน" />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filterYear} onValueChange={setFilterYear}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="ปี" />
        </SelectTrigger>
        <SelectContent>
          {getYearOptions().map((y) => (
            <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(filterMonth !== "all" || filterYear !== "all") && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClearFilter} 
          className="h-8 text-xs border-rose-200 hover:border-rose-300 text-rose-600 hover:text-rose-700 bg-rose-500/5 hover:bg-rose-500/10 dark:border-rose-900/30 dark:text-rose-400 dark:hover:text-rose-300 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 cursor-pointer transition-colors"
        >
          ล้างตัวกรอง
        </Button>
      )}
    </div>
  );

  return (
    <DataTable columns={columns} data={transactionsData?.data || []} action={filterAction} rightAction={rightAction} />
  );
}
