import { Button } from "@/components/ui/button.tsx";
import { Pencil, Trash2, Copy } from "lucide-react";

interface ActionCellProps {
  onEdit: () => void;
  onDelete: () => void;
  onCopy?: () => void;
  editTitle?: string;
  deleteTitle?: string;
  copyTitle?: string;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function ActionCell({
  onEdit,
  onDelete,
  onCopy,
  editTitle = "แก้ไขข้อมูล",
  deleteTitle = "ลบข้อมูล",
  copyTitle = "คัดลอกรายการ",
  canEdit = true,
  canDelete = true,
}: ActionCellProps) {
  return (
    <div className="flex items-center gap-1">
      {canEdit && (
        <Button
          type="button"
          size="icon"
          onClick={onEdit}
          className="h-7 w-7 bg-primary/5 hover:bg-primary/15 dark:bg-primary/10 dark:hover:bg-primary/20 text-primary border border-primary/20 dark:border-primary/30 cursor-pointer transition-colors"
          title={editTitle}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
      {onCopy && (
        <Button
          type="button"
          size="icon"
          onClick={onCopy}
          className="h-7 w-7 bg-amber-600/5 hover:bg-amber-600/15 dark:bg-amber-400/10 dark:hover:bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-600/20 dark:border-amber-400/30 cursor-pointer transition-colors"
          title={copyTitle}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      )}
      {canDelete && (
        <Button
          type="button"
          size="icon"
          onClick={onDelete}
          className="h-7 w-7 bg-destructive/5 hover:bg-destructive/15 dark:bg-destructive/10 dark:hover:bg-destructive/20 text-destructive border border-destructive/20 dark:border-destructive/30 cursor-pointer transition-colors"
          title={deleteTitle}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
