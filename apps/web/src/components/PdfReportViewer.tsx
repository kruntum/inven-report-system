import React from "react";
// @ts-ignore
import * as pdfMake from "pdfmake/build/pdfmake.js";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { 
  getMonthNameThai, 
  arrayBufferToBase64, 
  buildDocDefinition 
} from "../lib/pdf-definition.ts";
import { MonthlyReport } from "../types/index.ts";

interface Props {
  report: MonthlyReport | null;
  userFullName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PdfReportViewer({ report: r, userFullName, open, onOpenChange }: Props) {
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [fontsReady, setFontsReady] = React.useState(false);
  const [fontVfsState, setFontVfsState] = React.useState<Record<string, string> | null>(null);
  const [garudaBase64, setGarudaBase64] = React.useState("");

  // Pre-load assets once on mount
  React.useEffect(() => {
    const load = async () => {
      try {
        const [regRes, boldRes] = await Promise.all([
          fetch("/fonts/Sarabun-Regular.ttf?v=1.0.1"),
          fetch("/fonts/Sarabun-Bold.ttf?v=1.0.1"),
        ]);
        if (regRes.ok && boldRes.ok) {
          const [rBuf, bBuf] = await Promise.all([regRes.arrayBuffer(), boldRes.arrayBuffer()]);
          setFontVfsState({
            "Sarabun-Regular.ttf": arrayBufferToBase64(rBuf),
            "Sarabun-Bold.ttf": arrayBufferToBase64(bBuf),
          });
          setFontsReady(true);
        }
        // Load garuda safely
        const gRes = await fetch("/images/garuda.png?v=1.0.1");
        if (gRes.ok) {
          const blob = await gRes.blob();
          if (blob.size > 1000) {
            await new Promise<void>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string;
                const commaIdx = result.indexOf(",");
                const rawBase64 = commaIdx > -1 ? result.substring(commaIdx + 1) : result;
                
                // Force correct image MIME prefix so pdfmake doesn't crash
                if (rawBase64.startsWith("/9j/")) {
                  setGarudaBase64("data:image/jpeg;base64," + rawBase64);
                } else if (rawBase64.startsWith("iVBOR")) {
                  setGarudaBase64("data:image/png;base64," + rawBase64);
                }
                resolve();
              };
              reader.readAsDataURL(blob);
            });
          }
        }
      } catch (e) {
        console.error("Asset pre-load failed:", e);
      }
    };
    load();
  }, []);

  // When dialog opens → generate PDF blob URL
  React.useEffect(() => {
    if (!open || !r || !fontsReady || !fontVfsState) return;
    setLoading(true);
    setPdfUrl(null);

    let activeBlobUrl: string | null = null;

    const handleGlobalError = (event: ErrorEvent) => {
      const errMsg = event.error?.message || event.message || String(event.error);
      console.error("Caught async global error during PDF generation:", event.error);
      try {
        toast.error("ข้อผิดพลาดในการสร้าง PDF (async): " + errMsg);
      } catch {
        alert("ข้อผิดพลาดในการสร้าง PDF (async): " + errMsg);
      }
      setLoading(false);
      removeListeners();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errMsg = event.reason?.message || String(event.reason);
      console.error("Caught async unhandled promise rejection during PDF generation:", event.reason);
      try {
        toast.error("ข้อผิดพลาดในการสร้าง PDF (promise): " + errMsg);
      } catch {
        alert("ข้อผิดพลาดในการสร้าง PDF (promise): " + errMsg);
      }
      setLoading(false);
      removeListeners();
    };

    const removeListeners = () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    try {
      const lib: any = (pdfMake as any).default || pdfMake;
      if (!lib || typeof lib.createPdf !== "function") {
        throw new Error("ไลบรารี pdfMake โหลดไม่สำเร็จหรือไม่มีฟังก์ชัน createPdf");
      }

      const vfs = fontVfsState;
      const fonts = { Sarabun: { normal: "Sarabun-Regular.ttf", bold: "Sarabun-Bold.ttf" } };

      const setupVfs = (target: any) => {
        if (!target) return;
        if (target.virtualfs?.writeFileSync) {
          try {
            target.virtualfs.writeFileSync("Sarabun-Regular.ttf", vfs["Sarabun-Regular.ttf"], "base64");
            target.virtualfs.writeFileSync("Sarabun-Bold.ttf", vfs["Sarabun-Bold.ttf"], "base64");
          } catch {}
        }
        target.vfs = vfs;
        target.fonts = fonts;
      };
      setupVfs(lib);
      setupVfs(pdfMake);
      if (typeof window !== "undefined") setupVfs((window as any).pdfMake);

      const docDef = buildDocDefinition(r, garudaBase64, userFullName);

      lib.createPdf(docDef).getBlob()
        .then((blob: Blob) => {
          const blobUrl = URL.createObjectURL(blob);
          activeBlobUrl = blobUrl;
          setPdfUrl(blobUrl);
          setLoading(false);
          removeListeners();
        })
        .catch((err: any) => {
          console.error("PDF generation failed:", err);
          try {
            toast.error("สร้าง PDF ไม่สำเร็จ: " + (err.message || String(err)));
          } catch {
            alert("สร้าง PDF ไม่สำเร็จ: " + (err.message || String(err)));
          }
          setLoading(false);
          removeListeners();
        });
    } catch (err: any) {
      console.error("PDF construction crashed:", err);
      try {
        toast.error("สร้าง PDF ไม่สำเร็จ: " + (err.message || String(err)));
      } catch {
        alert("สร้าง PDF ไม่สำเร็จ: " + (err.message || String(err)));
      }
      setLoading(false);
      removeListeners();
    }

    return () => {
      removeListeners();
      if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
      }
    };
  }, [open, r, fontsReady, fontVfsState, garudaBase64, userFullName]);

  const handleDownload = () => {
    if (!pdfUrl || !r) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `แบบ_มพอ_01_${r.productName}_${new Date(r.reportYear, r.reportMonth - 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" })}.pdf`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1100px] h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-bold">
              📄 แบบ มพอ. ๐๑ — {r ? `เดือน ${getMonthNameThai(r.reportMonth)} พ.ศ. ${r.reportYear + 543}` : ""}
            </DialogTitle>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={!pdfUrl}
              className="h-8 text-xs font-semibold gap-1.5 mr-8"
            >
              📥 ดาวน์โหลด PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-muted/30 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="text-sm text-muted-foreground animate-pulse">⏳ กำลังสร้างเอกสาร PDF...</div>
            </div>
          )}
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PDF Viewer"
            />
          ) : !loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {fontsReady ? "เตรียมสร้างเอกสาร..." : "⏳ กำลังโหลดฟอนต์ภาษาไทย..."}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
