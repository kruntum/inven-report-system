import * as React from "react";
import { CalendarIcon } from "lucide-react";
import dayjs from "dayjs";

import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Label } from "@/components/ui/label.tsx";

interface DatePickerProps {
  value?: string; // YYYY-MM-DD format
  onChange?: (dateStr: string) => void;
  label?: string;
  error?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  label,
  error,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse YYYY-MM-DD safely
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.toDate() : undefined;
  }, [value]);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (onChange) {
      if (selectedDate) {
        onChange(dayjs(selectedDate).format("YYYY-MM-DD"));
      } else {
        onChange("");
      }
    }
    setOpen(false); // Auto-close popover on date selection
  };

  return (
    <div className={cn("flex flex-col gap-1 w-full", className)}>
      {label && <Label className="text-[11px] font-bold text-muted-foreground/90">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal h-8 text-xs",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
            {value ? (
              dayjs(value).format("DD/MM/YYYY")
            ) : (
              <span>เลือกวันที่</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            defaultMonth={dateValue}
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
      {error && (
        <span className="text-xs text-destructive font-medium">{error}</span>
      )}
    </div>
  );
}

export default DatePicker;
