import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  enableGlobalFilter?: boolean;
  action?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "ค้นหาข้อมูลในตาราง...",
  enableGlobalFilter = true,
  action,
  rightAction,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState<string>("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      globalFilter,
    },
  });

  // Set default page size to 50 on mount
  React.useEffect(() => {
    table.setPageSize(50);
  }, [table]);

  const handlePageSizeChange = (val: string) => {
    if (val === "all") {
      table.setPageSize(data.length || 999999);
    } else {
      table.setPageSize(Number(val));
    }
  };

  return (
    <div className="w-full flex flex-col h-full space-y-3">
      {/* Top Section: Global Filter & Action & Right Action (Fixed Top) */}
      {enableGlobalFilter && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-wrap flex-1 min-w-0">
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-xs h-9 text-xs w-full sm:w-auto bg-background/80"
            />
            {action}
          </div>
          {rightAction && (
            <div className="flex items-center shrink-0">
              {rightAction}
            </div>
          )}
        </div>
      )}

      {/* Main Table Layout Container */}
      <div className="rounded-md border border-border/60 flex-1 min-h-0 relative flex flex-col overflow-hidden bg-background/40">
        {/* 1. FIXED HEADER CONTAINER (Outside ScrollArea - Clean Thin Single Border) */}
        <div className="bg-card z-20 border-b border-border/40 shrink-0 overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent bg-muted/30 border-0">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap font-extrabold text-xs text-foreground/90 h-10 border-0">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
          </Table>
        </div>

        {/* 2. SCROLLABLE BODY CONTAINER (Inside ScrollArea - Only Body Rows Scroll) */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <ScrollArea className="h-full w-full">
            <Table>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="hover:bg-muted/30 transition-colors border-b border-border/40"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="whitespace-nowrap py-2.5 text-xs">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-32 text-center text-xs text-muted-foreground"
                    >
                      ไม่พบข้อมูลรายการในระบบ
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>

      {/* Footer Section: Pagination and Page Size (Fixed Footer) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 shrink-0 border-t border-border/40">
        {/* Left: Page Size Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">แสดงแถวต่อหน้า</span>
          <Select
            defaultValue="50"
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="w-[80px] h-8 text-xs bg-background/80">
              <SelectValue placeholder="50" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="300">300</SelectItem>
              <SelectItem value="500">500</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            (ทั้งหมด {table.getFilteredRowModel().rows.length} รายการ)
          </span>
        </div>

        {/* Right: Pagination Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 text-xs font-semibold cursor-pointer"
          >
            ก่อนหน้า
          </Button>
          <div className="flex items-center justify-center text-xs font-semibold min-w-[80px] text-muted-foreground">
            หน้า {table.getState().pagination.pageIndex + 1} จาก{" "}
            {table.getPageCount() || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 text-xs font-semibold cursor-pointer"
          >
            ถัดไป
          </Button>
        </div>
      </div>
    </div>
  );
}
