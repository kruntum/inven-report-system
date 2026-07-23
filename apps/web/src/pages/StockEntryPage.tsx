import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent } from "@/components/ui/dialog.tsx";
import { StockTransaction } from "../types/index.ts";
import { StockEntryForm } from "../components/stock/StockEntryForm.tsx";
import { StockEntryTable } from "../components/stock/StockEntryTable.tsx";
import { Plus } from "lucide-react";

export function StockEntryPage() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingTx, setEditingTx] = React.useState<StockTransaction | null>(null);

  const handleEdit = (tx: StockTransaction) => {
    setEditingTx(tx);
    setIsModalOpen(true);
  };

  const handleCopy = (tx: StockTransaction) => {
    const todayStr = new Date().toLocaleDateString('sv-SE'); // returns YYYY-MM-DD safely
    setEditingTx({
      ...tx,
      id: "",
      transactionDate: todayStr,
    });
    setIsModalOpen(true);
  };

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setEditingTx(null);
  };

  const createButton = (
    <Button size="sm" className="font-bold text-xs h-9 cursor-pointer gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsModalOpen(true)}>
      <Plus className="h-4 w-4" /> บันทึกธุรกรรมคลังสินค้า
    </Button>
  );

  return (
    <Card className="h-[calc(100vh-5.5rem)] flex flex-col border-border/60 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden p-0">
      {/* Top Header */}
      <CardHeader className="pb-3 border-b border-border/40 shrink-0 px-6 pt-4">
        <CardTitle className="text-2xl font-extrabold tracking-tight">บันทึกรายการประจำวัน</CardTitle>
        <CardDescription className="text-xs mt-0.5">
          ข้อมูลรับซื้อ จำหน่าย และนำไปใช้แปรรูป ประจำแต่ละคลังสินค้า
        </CardDescription>
      </CardHeader>

      {/* Main Full-Height Content: DataTable Flex-1 with internal scroll */}
      <CardContent className="flex-1 overflow-hidden p-6 pt-4 flex flex-col min-h-0">
        <StockEntryTable onEdit={handleEdit} onCopy={handleCopy} rightAction={createButton} />
      </CardContent>

      {/* Entry Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) setEditingTx(null);
      }}>
        <DialogContent className="sm:max-w-[850px] p-0 max-h-[85vh] h-[85vh] flex flex-col overflow-hidden">
          <StockEntryForm editingTx={editingTx} onSuccess={handleFormSuccess} onClose={() => setIsModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default StockEntryPage;