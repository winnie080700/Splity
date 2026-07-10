"use client";

import { Clipboard, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";

type Transfer = { amount: string; from: string; status: string; to: string };

export function SettlementExportButton({
  filename,
  groupDate,
  groupName,
  transfers,
}: {
  filename: string;
  groupDate: string;
  groupName: string;
  transfers: Transfer[];
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { t } = useTranslation();

  function preview() {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = Math.max(520, 300 + transfers.length * 58);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f4f8f7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.roundRect(40, 40, 1120, canvas.height - 80, 28);
    ctx.fill();
    ctx.fillStyle = "#0f766e";
    ctx.font = "700 14px Arial";
    ctx.fillText(t("groupDetail.transferPlan").toUpperCase(), 76, 88);
    ctx.fillStyle = "#0c1538";
    ctx.font = "800 34px Arial";
    ctx.fillText(groupName, 76, 132);
    ctx.fillStyle = "#5a6079";
    ctx.font = "600 14px Arial";
    ctx.fillText(groupDate, 76, 158);
    ctx.fillStyle = "#e6f6f3";
    ctx.fillRect(72, 190, 1056, 44);
    ctx.fillStyle = "#0f766e";
    ctx.font = "700 12px Arial";
    [t("settlements.from"), t("settlements.to"), t("groupDetail.amount"), t("invitations.status")].forEach(
      (label, index) => ctx.fillText(label.toUpperCase(), 96 + index * 260, 217),
    );
    transfers.forEach((transfer, index) => {
      const y = 270 + index * 58;
      ctx.fillStyle = "#0c1538";
      ctx.font = "600 15px Arial";
      [transfer.from, transfer.to, transfer.amount, transfer.status].forEach((value, column) =>
        ctx.fillText(value, 96 + column * 260, y),
      );
      ctx.strokeStyle = "#dce8e6";
      ctx.beginPath();
      ctx.moveTo(76, y + 22);
      ctx.lineTo(1124, y + 22);
      ctx.stroke();
    });
    setPreviewUrl(canvas.toDataURL("image/png"));
  }

  async function copy() {
    if (!previewUrl || !navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      toast.error(t("export.copyUnsupported"));
      return;
    }
    try {
      const blob = await fetch(previewUrl).then((response) => response.blob());
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success(t("export.copied"));
    } catch {
      toast.error(t("export.copyUnsupported"));
    }
  }

  function download() {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = previewUrl;
    link.click();
  }

  return (
    <>
      <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--splity-line)] bg-white px-3 text-sm font-bold" onClick={preview} type="button">
        <Download className="h-4 w-4" />{t("common.export")}
      </button>
      <Dialog onOpenChange={(open) => !open && setPreviewUrl(null)} open={Boolean(previewUrl)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle>{t("export.previewTitle")}</DialogTitle><DialogDescription>{t("export.previewBody")}</DialogDescription></DialogHeader>
          {previewUrl ? <div className="max-h-[65vh] overflow-auto rounded-2xl border bg-[var(--splity-bg)] p-3">{/* eslint-disable-next-line @next/next/no-img-element */}<img alt={t("export.previewTitle")} className="w-full rounded-xl" src={previewUrl} /></div> : null}
          <DialogFooter className="w-full border-t border-[var(--splity-line)] pt-5">
            <Button className="sm:min-w-40" onClick={copy} type="button" variant="secondary"><Clipboard className="h-4 w-4" />{t("export.copyImage")}</Button>
            <Button className="sm:min-w-40" onClick={download} type="button"><Download className="h-4 w-4" />{t("export.downloadImage")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
