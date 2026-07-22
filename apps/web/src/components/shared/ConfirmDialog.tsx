import { useConfirm } from "../../store/useConfirm.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";

export function ConfirmDialog() {
  const { isOpen, title, description, onConfirm, onCancel, close } = useConfirm();

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    close();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
      <DialogContent className="sm:max-w-[400px] p-5">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base font-extrabold flex items-center gap-2 text-amber-600 dark:text-amber-500">
            ⚠️ {title}
          </DialogTitle>
          <DialogDescription className="text-xs pt-1.5 leading-relaxed text-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-0 flex flex-row justify-end">
          <Button variant="outline" onClick={handleCancel} className="h-8 text-xs font-semibold cursor-pointer">
            ยกเลิก
          </Button>
          <Button onClick={handleConfirm} className="h-8 text-xs font-semibold cursor-pointer">
            ยืนยัน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
