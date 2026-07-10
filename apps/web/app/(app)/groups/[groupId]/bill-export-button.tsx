"use client";

import { Clipboard, Download } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation, type MessageKey } from "@/lib/i18n";

import { BillsExportReport, type ExportBill } from "./bills-export-report";
import { sanitizeExportFilename } from "./bills-export-report-utils";

type BillExportButtonProps = {
  bills: ExportBill[];
  filename: string;
  groupDate: string;
  groupName: string;
  totals: {
    fees: string;
    grandTotal: string;
    subtotal: string;
  };
};

export function BillExportButton({
  bills,
  filename,
  groupDate,
  groupName,
  totals,
}: BillExportButtonProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);
  const [reportReady, setReportReady] = useState(false);

  function openPreview() {
    if (!bills.length) {
      toast.error(t("bills.exportNoBills"));
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button
        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[var(--splity-line)] bg-white px-3 text-sm font-bold text-[var(--splity-ink)] transition-colors duration-200 hover:border-teal-600 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        onClick={openPreview}
        type="button"
      >
        <Download className="h-4 w-4" />
        {t("common.export")}
      </button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="flex max-w-6xl flex-col !overflow-y-hidden">
          <DialogHeader>
            <DialogTitle>{t("export.previewTitle")}</DialogTitle>
            <DialogDescription>{t("export.previewBody")}</DialogDescription>
          </DialogHeader>
          {open ? (
            <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-[var(--splity-line)] bg-[var(--splity-bg)] p-3 sm:p-5">
              <BillsExportReport
                bills={bills}
                canvasRef={canvasRef}
                groupDate={groupDate}
                groupName={groupName}
                onReady={setReportReady}
                totals={totals}
              />
            </div>
          ) : null}
          <DialogFooter className="w-full border-t border-[var(--splity-line)] pt-5">
            <Button
              className="sm:min-w-40"
              disabled={!reportReady}
              onClick={() => canvasRef.current && copyImage(canvasRef.current, t)}
              type="button"
              variant="secondary"
            >
              <Clipboard className="h-4 w-4" />
              {t("export.copyImage")}
            </Button>
            <Button
              className="sm:min-w-40"
              disabled={!reportReady}
              onClick={() => canvasRef.current && downloadImage(canvasRef.current, filename, t)}
              type="button"
            >
              <Download className="h-4 w-4" />
              {t("export.downloadImage")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function downloadImage(canvas: HTMLCanvasElement, filename: string, t: (key: MessageKey) => string) {
  const link = document.createElement("a");
  link.download = `${sanitizeExportFilename(filename)}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  toast.success(t("bills.exportReady"));
}

function copyImage(canvas: HTMLCanvasElement, t: (key: MessageKey) => string) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    toast.error(t("export.copyUnsupported"));
    return;
  }
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success(t("export.copied"));
    } catch {
      toast.error(t("export.copyUnsupported"));
    }
  }, "image/png");
}
