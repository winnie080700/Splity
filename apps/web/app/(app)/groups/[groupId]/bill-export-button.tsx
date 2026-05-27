"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { useTranslation, type MessageKey } from "@/lib/i18n";

type ExportBill = {
  date: string;
  fees: string;
  grandTotal: string;
  items: {
    amount: string;
    description: string;
    participants: string[];
  }[];
  payer: string;
  shares: {
    fee: string;
    participant: string;
    preFee: string;
    total: string;
  }[];
  splitModeKey: MessageKey;
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

    const width = 1400;
    const billHeights = bills.map((bill) => {
      const itemRows = Math.max(1, bill.items.length);
      const shareRows = Math.max(1, bill.shares.length);
      return 170 + itemRows * 34 + shareRows * 30;
    });
    const height = 210 + billHeights.reduce((sum, itemHeight) => sum + itemHeight, 0) + 84;
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

    let cursorY = 156;
    bills.forEach((bill, index) => {
      const billHeight = billHeights[index];
      ctx.fillStyle = index % 2 === 0 ? "#fbfaf5" : "#ffffff";
      roundRect(ctx, 60, cursorY, width - 120, billHeight - 16, 18);
      ctx.fill();

      ctx.fillStyle = "#0c1538";
      ctx.font = "800 24px Arial";
      ctx.fillText(trimText(ctx, bill.storeName, 520), 88, cursorY + 42);
      ctx.font = "700 13px Arial";
      ctx.fillStyle = "#5f6681";
      ctx.fillText(
        `${bill.date} · ${t("bills.paidByShort")}: ${bill.payer || t("bills.unknown")} · ${t(bill.splitModeKey)}`,
        88,
        cursorY + 66
      );

      const totalX = width - 360;
      ctx.fillStyle = "#fff4d8";
      roundRect(ctx, totalX, cursorY + 24, 260, 58, 14);
      ctx.fill();
      ctx.fillStyle = "#5f6681";
      ctx.font = "700 11px Arial";
      ctx.fillText(t("groupDetail.total").toUpperCase(), totalX + 18, cursorY + 47);
      ctx.fillStyle = "#0c1538";
      ctx.font = "800 22px Arial";
      ctx.fillText(bill.grandTotal, totalX + 18, cursorY + 72);

      const metaY = cursorY + 100;
      ctx.fillStyle = "#f2f1ec";
      roundRect(ctx, 88, metaY - 22, width - 176, 34, 10);
      ctx.fill();
      ctx.fillStyle = "#0c1538";
      ctx.font = "800 13px Arial";
      ctx.fillText(`${t("bills.subtotal")}: ${bill.subtotal}`, 108, metaY);
      ctx.fillText(`${t("bills.fees")}: ${bill.fees}`, 310, metaY);

      const itemStartY = cursorY + 140;
      ctx.fillStyle = "#d8941a";
      ctx.font = "800 12px Arial";
      ctx.fillText(t("bills.items").toUpperCase(), 88, itemStartY - 18);
      ctx.fillText(t("bills.shares").toUpperCase(), 760, itemStartY - 18);

      if (bill.items.length) {
        bill.items.forEach((item, itemIndex) => {
          const rowY = itemStartY + itemIndex * 34;
          ctx.fillStyle = "#0c1538";
          ctx.font = "700 14px Arial";
          ctx.fillText(trimText(ctx, item.description, 280), 88, rowY);
          ctx.font = "700 13px Arial";
          ctx.fillText(item.amount, 392, rowY);
          ctx.fillStyle = "#5f6681";
          ctx.font = "600 12px Arial";
          ctx.fillText(
            trimText(
              ctx,
              `${t("bills.responsibleParticipants")}: ${item.participants.join(", ") || t("bills.none")}`,
              260
            ),
            490,
            rowY
          );
        });
      } else {
        ctx.fillStyle = "#5f6681";
        ctx.font = "600 13px Arial";
        ctx.fillText(t("bills.none"), 88, itemStartY);
      }

      if (bill.shares.length) {
        bill.shares.forEach((share, shareIndex) => {
          const rowY = itemStartY + shareIndex * 30;
          ctx.fillStyle = "#0c1538";
          ctx.font = "700 13px Arial";
          ctx.fillText(trimText(ctx, share.participant, 180), 760, rowY);
          ctx.fillStyle = "#5f6681";
          ctx.font = "600 12px Arial";
          ctx.fillText(`${t("bills.preFee")}: ${share.preFee}`, 950, rowY);
          ctx.fillText(`${t("bills.fee")}: ${share.fee}`, 1090, rowY);
          ctx.fillStyle = "#0c1538";
          ctx.font = "800 12px Arial";
          ctx.fillText(share.total, 1210, rowY);
        });
      } else {
        ctx.fillStyle = "#5f6681";
        ctx.font = "600 13px Arial";
        ctx.fillText(t("bills.none"), 760, itemStartY);
      }

      cursorY += billHeight;
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

function trimText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }

  return `${trimmed}...`;
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
