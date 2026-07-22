import { useTheme } from "./theme-provider.tsx";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <button
      onClick={() => setMode(mode === "dark" ? "light" : "dark")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-muted transition-colors cursor-pointer"
      title="สลับโหมดแสง/มืด"
    >
      {mode === "dark" ? (
        <Sun className="h-4 w-4 text-amber-500" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}

export default ThemeToggle;
