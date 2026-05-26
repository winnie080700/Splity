"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { useTranslation } from "@/lib/i18n";

type ExportBill = {
  date: string;
  fees: string;
  grandTotal: string;
  payer: string;
  storeName: string;
  subtotal: string;
};

type BillExportButtonProps = {
  bills: ExportBill[];
  filename: string;
  totals: {
    fees: string;
    grandTotal: string;
    subtotal: string;
  };
};

export function BillExportButton({
  bills,
  filename,
  totals,
}: BillExportButtonProps) {
  const { t } = useTranslation();

  function exportPng() {
    if (!bills.length) {
      toast.error(t("bills.exportNoBills"));
      return;
    }

    const width = 1200;
    const rowHeight = 54;
    const height = 220 + bills.length * rowHeight;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f2f1ec";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, 40, 40, width - 80, height - 80, 28);
    ctx.fill();

    ctx.fillStyle = "#d8941a";
    ctx.font = "700 14px Arial";
    ctx.fillText(t("groupDetail.billsKicker").toUpperCase(), 72, 82);
    ctx.fillStyle = "#0c1538";
    ctx.font = "800 34px Arial";
    ctx.fillText(t("bills.exportTitle"), 72, 124);

    const headers = [
      t("groupDetail.date"),
      t("groupDetail.store"),
      t("groupDetail.primaryPayer"),
      t("bills.subtotal"),
      t("bills.fees"),
      t("groupDetail.total"),
    ];
    const cols = [72, 210, 470, 690, 840, 980];
    ctx.fillStyle = "#1b2a6b";
    roundRect(ctx, 60, 154, width - 120, 38, 12);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 13px Arial";
    headers.forEach((header, index) => ctx.fillText(header, cols[index], 178));

    bills.forEach((bill, index) => {
      const y = 206 + index * rowHeight;
      ctx.fillStyle = index % 2 === 0 ? "#fbfaf5" : "#ffffff";
      ctx.fillRect(60, y - 26, width - 120, rowHeight);
      ctx.fillStyle = "#0c1538";
      ctx.font = "700 14px Arial";
      [
        bill.date,
        bill.storeName,
        bill.payer || t("bills.unknown"),
        bill.subtotal,
        bill.fees,
        bill.grandTotal,
      ].forEach(
        (value, colIndex) => ctx.fillText(value, cols[colIndex], y + 6)
      );
    });

    const footerY = height - 74;
    ctx.fillStyle = "#fff4d8";
    roundRect(ctx, 60, footerY - 28, width - 120, 46, 12);
    ctx.fill();
    ctx.fillStyle = "#0c1538";
    ctx.font = "800 15px Arial";
    ctx.fillText(`${t("bills.subtotal")}: ${totals.subtotal}`, 620, footerY);
    ctx.fillText(`${t("bills.fees")}: ${totals.fees}`, 800, footerY);
    ctx.fillText(`${t("groupDetail.groupTotal")}: ${totals.grandTotal}`, 950, footerY);

    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success(t("bills.exportReady"));
  }

  return (
    <button
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--splity-line)] bg-white px-3 text-sm font-bold text-[var(--splity-ink)] transition hover:bg-[var(--splity-bg)]"
      onClick={exportPng}
      type="button"
    >
      <Download className="h-4 w-4" />
      {t("common.export")}
    </button>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
