import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { api } from "../../lib/api.ts";
import { toast } from "sonner";

interface QuickPartnerFormProps {
  initialTypeId?: number;
  onSuccess: (partnerId: string) => void;
  onCancel: () => void;
}

export function QuickPartnerForm({
  initialTypeId = 1,
  onSuccess,
  onCancel,
}: QuickPartnerFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [partnerTypeId, setPartnerTypeId] = React.useState(initialTypeId);
  const [regNo, setRegNo] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);

  // Sync initial type when it changes
  React.useEffect(() => {
    setPartnerTypeId(initialTypeId);
  }, [initialTypeId]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("กรุณากรอกชื่อคู่ค้า");
      return;
    }
    setIsPending(true);
    try {
      const res = await api.post("/stock/partners", {
        name: name.trim(),
        partnerTypeId: Number(partnerTypeId),
        regNo: regNo.trim() || null,
        address: address.trim() || null
      });
      if (res.success) {
        toast.success("เพิ่มข้อมูลคู่ค้าใหม่เข้าระบบสำเร็จ");
        queryClient.invalidateQueries({ queryKey: ["partners"] });
        onSuccess(res.data.id);
      } else {
        toast.error(res.error || "เกิดข้อผิดพลาดในการบันทึกคู่ค้า");
      }
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="rounded-lg border border-border/80 p-2.5 bg-muted/30 grid grid-cols-1 sm:grid-cols-2 gap-2">
      <span className="text-[10px] font-bold block text-foreground sm:col-span-2">ลงทะเบียนคู่ค้าใหม่</span>
      <div className="space-y-0.5">
        <Label className="text-[10px] font-semibold text-muted-foreground/90">ชื่อคู่ค้า</Label>
        <Input 
          placeholder="เช่น โรงงานสามพราน, สวนลุงพงษ์" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          className="h-8 text-xs bg-background"
        />
      </div>
      <div className="space-y-0.5">
        <Label className="text-[10px] font-semibold text-muted-foreground/90">ประเภทคู่ค้า</Label>
        <Select 
          value={partnerTypeId.toString()} 
          onValueChange={(val) => setPartnerTypeId(Number(val))}
        >
          <SelectTrigger className="h-8 text-xs bg-background">
            <SelectValue placeholder="เลือกประเภท" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">โรงงานแปรรูป (DOA Number)</SelectItem>
            <SelectItem value="2">สวน/เกษตรกร (GAP Number)</SelectItem>
            <SelectItem value="3">ผู้รวบรวม/ลานเท</SelectItem>
            <SelectItem value="4">บริษัททั่วไป / ลูกค้า</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(partnerTypeId === 1 || partnerTypeId === 2) && (
        <div className="space-y-0.5 sm:col-span-2">
          <Label className="text-[10px] font-semibold text-muted-foreground/90">
            {partnerTypeId === 1 ? "เลขทะเบียนโรงงาน (DOA Number)" : "เลขทะเบียนสวน (GAP Number)"}
          </Label>
          <Input 
            placeholder="ระบุเลขทะเบียนคุม" 
            value={regNo} 
            onChange={(e) => setRegNo(e.target.value)} 
            className="h-8 text-xs bg-background"
          />
        </div>
      )}
      <div className="space-y-0.5 sm:col-span-2">
        <Label className="text-[10px] font-semibold text-muted-foreground/90">ที่อยู่ / รายละเอียด</Label>
        <Textarea 
          placeholder="ระบุที่อยู่คู่ค้า..." 
          value={address} 
          onChange={(e) => setAddress(e.target.value)} 
          rows={1}
          className="text-xs min-h-[36px] p-2 bg-background"
        />
      </div>
      <div className="flex gap-2 sm:col-span-2 mt-1">
        <Button 
          type="button" 
          variant="outline"
          size="sm" 
          onClick={onCancel}
          className="w-1/2 h-8 text-xs cursor-pointer"
        >
          ยกเลิก
        </Button>
        <Button 
          type="button" 
          size="sm" 
          disabled={isPending}
          onClick={handleSave}
          className="w-1/2 h-8 text-xs font-semibold cursor-pointer"
        >
          {isPending ? "กำลังบันทึก..." : "บันทึกคู่ค้าใหม่"}
        </Button>
      </div>
    </div>
  );
}
