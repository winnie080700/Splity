"use client";

import { useEffect, type RefObject } from "react";

import { useTranslation, type MessageKey } from "@/lib/i18n";

import {
  BILL_GAP,
  BILLS_START_Y,
  FOOTER_HEIGHT,
  getBillsExportReportHeight,
} from "./bills-export-report-utils";

export type ExportBill = {
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

type BillsExportReportProps = {
  bills: ExportBill[];
  canvasRef: RefObject<HTMLCanvasElement | null>;
  groupDate: string;
  groupName: string;
  onReady: (ready: boolean) => void;
  totals: {
    fees: string;
    grandTotal: string;
    subtotal: string;
  };
};

const WIDTH = 1200;
const CARD_X = 48;
const CARD_WIDTH = WIDTH - CARD_X * 2;
const FONT = '"Inter", "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif';

export function BillsExportReport({
  bills,
  canvasRef,
  groupDate,
  groupName,
  onReady,
  totals,
}: BillsExportReportProps) {
  const { t } = useTranslation();
  const height = getBillsExportReportHeight(bills);

  useEffect(() => {
    let cancelled = false;
    onReady(false);

    async function render() {
      await document.fonts?.ready;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || cancelled) return;

      const logo = await loadImage("/splity-logo.svg").catch(() => null);
      if (cancelled) return;
      drawReport(ctx, { bills, groupDate, groupName, height, logo, t, totals });
      onReady(true);
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [bills, canvasRef, groupDate, groupName, height, onReady, t, totals]);

  return (
    <canvas
      aria-label={t("bills.reportTitle")}
      className="block h-auto w-full max-w-[1200px] rounded-xl bg-white"
      height={height}
      ref={canvasRef}
      width={WIDTH}
    />
  );
}

type DrawReportInput = Omit<BillsExportReportProps, "canvasRef" | "onReady"> & {
  height: number;
  logo: HTMLImageElement | null;
  t: (key: MessageKey) => string;
};

function drawReport(
  ctx: CanvasRenderingContext2D,
  { bills, groupDate, groupName, height, logo, t, totals }: DrawReportInput
) {
  ctx.clearRect(0, 0, WIDTH, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.textBaseline = "alphabetic";

  drawHeader(ctx, { bills, groupDate, groupName, logo, t });
  drawSummary(ctx, bills.length, totals, t);

  let cursorY = BILLS_START_Y;
  bills.forEach((bill, index) => {
    cursorY += drawBillCard(ctx, bill, index, cursorY, t) + BILL_GAP;
  });

  drawFinalSummary(ctx, cursorY + 8, totals, t);
  drawBrandFooter(ctx, height - 42, logo, t);
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  {
    bills,
    groupDate,
    groupName,
    logo,
    t,
  }: Pick<DrawReportInput, "bills" | "groupDate" | "groupName" | "logo" | "t">
) {
  if (logo) {
    ctx.drawImage(logo, 48, 34, 34, 34);
  } else {
    circle(ctx, 65, 51, 17, "#0f9b8e");
  }
  text(ctx, t("common.appName"), 92, 59, 24, 800, "#0f9b8e");

  text(ctx, t("bills.reportTitle"), 48, 113, 38, 800, "#0c1538");
  text(ctx, trimText(ctx, groupName, 680, 31, 800), 48, 157, 31, 800, "#0c1538");
  text(ctx, `${groupDate}  ·  ${t("bills.generatedBy")}`, 48, 189, 15, 600, "#5a6079");

  roundedRect(ctx, 928, 83, 224, 74, 16, "#effcf9");
  drawDocumentIcon(ctx, 954, 102);
  text(ctx, `${bills.length} ${t("bills.reportCountSuffix")}`, 995, 114, 18, 800, "#0c1538");
  text(ctx, t("bills.detailedReport").toUpperCase(), 995, 139, 12, 800, "#5a6079");

  line(ctx, 48, 222, 1152, 222, "#d6eeea");
}

function drawSummary(
  ctx: CanvasRenderingContext2D,
  billCount: number,
  totals: BillsExportReportProps["totals"],
  t: (key: MessageKey) => string
) {
  const y = 246;
  const cellWidth = CARD_WIDTH / 4;
  roundedRect(ctx, CARD_X, y, CARD_WIDTH, 72, 14, "#ffffff", "#dce7e8");
  roundedRect(ctx, CARD_X + cellWidth * 3, y, cellWidth, 72, 14, "#effaf8");

  const cells = [
    [t("bills.totalBills"), String(billCount)],
    [t("bills.subtotal"), totals.subtotal],
    [t("bills.fees"), totals.fees],
    [t("groupDetail.groupTotal"), totals.grandTotal],
  ];

  cells.forEach(([label, value], index) => {
    const x = CARD_X + cellWidth * index;
    if (index) line(ctx, x, y, x, y + 72, "#dce7e8");
    circle(ctx, x + 30, y + 36, 18, "#dff5f1");
    drawStatIcon(ctx, x + 30, y + 36, index);
    text(ctx, label.toUpperCase(), x + 58, y + 28, 11, 800, index === 3 ? "#0f8f82" : "#59627e");
    text(ctx, value, x + 58, y + 53, index === 3 ? 22 : 19, 800, index === 3 ? "#0f9b8e" : "#0c1538");
  });
}

function drawBillCard(
  ctx: CanvasRenderingContext2D,
  bill: ExportBill,
  index: number,
  y: number,
  t: (key: MessageKey) => string
) {
  const rows = Math.max(1, bill.items.length, bill.shares.length);
  const height = 217 + (rows - 1) * 30;
  roundedRect(ctx, CARD_X, y, CARD_WIDTH, height, 16, "#ffffff", "#dce3e8");

  circle(ctx, 78, y + 31, 18, "#0f9b8e");
  centeredText(ctx, String(index + 1), 78, y + 37, 14, 800, "#ffffff");
  text(ctx, trimText(ctx, bill.storeName, 670, 23, 800), 108, y + 35, 23, 800, "#0c1538");
  text(
    ctx,
    `${bill.date}  ·  ${t("bills.paidByShort")} ${bill.payer || t("bills.unknown")}  ·  ${t(bill.splitModeKey)}`,
    108,
    y + 61,
    13,
    600,
    "#59627e"
  );
  rightText(ctx, bill.grandTotal, 1126, y + 39, 21, 800, "#0f9b8e");

  roundedRect(ctx, 68, y + 78, 1064, 34, 9, "#f6f8fa");
  text(ctx, `${t("bills.subtotal")}: ${bill.subtotal}`, 132, y + 100, 13, 800, "#273354");
  line(ctx, 330, y + 86, 330, y + 104, "#d7dfe5");
  text(ctx, `${t("bills.fees")}: ${bill.fees}`, 372, y + 100, 13, 800, "#273354");

  const sectionY = y + 139;
  text(ctx, t("bills.items").toUpperCase(), 74, sectionY, 12, 800, "#0f8f82");
  text(ctx, t("bills.participantShares").toUpperCase(), 600, sectionY, 12, 800, "#0f8f82");

  const headerY = sectionY + 25;
  text(ctx, t("bills.description").toUpperCase(), 74, headerY, 10, 800, "#65708c");
  text(ctx, t("bills.splitWith").toUpperCase(), 280, headerY, 10, 800, "#65708c");
  rightText(ctx, t("bills.amount").toUpperCase(), 544, headerY, 10, 800, "#65708c");
  text(ctx, t("bills.participant").toUpperCase(), 600, headerY, 10, 800, "#65708c");
  rightText(ctx, t("bills.itemShare").toUpperCase(), 834, headerY, 10, 800, "#65708c");
  rightText(ctx, t("bills.fees").toUpperCase(), 968, headerY, 10, 800, "#65708c");
  rightText(ctx, t("bills.total").toUpperCase(), 1126, headerY, 10, 800, "#65708c");
  line(ctx, 74, headerY + 9, 544, headerY + 9, "#dce3e8");
  line(ctx, 600, headerY + 9, 1126, headerY + 9, "#dce3e8");
  line(ctx, 570, sectionY - 8, 570, y + height - 20, "#e1e7eb");

  const firstRowY = headerY + 36;
  if (bill.items.length) {
    bill.items.forEach((item, row) => {
      const rowY = firstRowY + row * 30;
      text(ctx, trimText(ctx, item.description, 190, 13, 700), 74, rowY, 13, 700, "#0c1538");
      text(ctx, trimText(ctx, item.participants.join(", ") || t("bills.none"), 170, 12, 600), 280, rowY, 12, 600, "#273354");
      rightText(ctx, item.amount, 544, rowY, 13, 700, "#0c1538");
    });
  } else {
    text(ctx, t("bills.none"), 74, firstRowY, 13, 600, "#59627e");
  }

  if (bill.shares.length) {
    bill.shares.forEach((share, row) => {
      const rowY = firstRowY + row * 30;
      text(ctx, trimText(ctx, share.participant, 170, 13, 700), 600, rowY, 13, 700, "#0c1538");
      rightText(ctx, share.preFee, 834, rowY, 12, 700, "#273354");
      rightText(ctx, share.fee, 968, rowY, 12, 700, "#273354");
      rightText(ctx, share.total, 1126, rowY, 13, 800, "#0c1538");
    });
  } else {
    text(ctx, t("bills.none"), 600, firstRowY, 13, 600, "#59627e");
  }

  return height;
}

function drawFinalSummary(
  ctx: CanvasRenderingContext2D,
  y: number,
  totals: BillsExportReportProps["totals"],
  t: (key: MessageKey) => string
) {
  roundedRect(ctx, CARD_X, y, CARD_WIDTH, 82, 14, "#effaf8", "#bfe8e1");
  circle(ctx, 80, y + 41, 19, "#c9eee8");
  drawCheck(ctx, 80, y + 41);
  text(ctx, t("bills.finalSummary").toUpperCase(), 112, y + 47, 14, 800, "#0f8f82");

  const stats = [
    [t("bills.subtotal"), totals.subtotal],
    [t("bills.fees"), totals.fees],
    [t("groupDetail.groupTotal"), totals.grandTotal],
  ];
  const starts = [550, 770, 970];
  stats.forEach(([label, value], index) => {
    if (index) line(ctx, starts[index] - 30, y + 22, starts[index] - 30, y + 60, "#cce5e1");
    centeredText(ctx, label, starts[index] + 70, y + 29, 11, 700, "#59627e");
    centeredText(ctx, value, starts[index] + 70, y + 58, index === 2 ? 22 : 17, 800, index === 2 ? "#0f9b8e" : "#0c1538");
  });
}

function drawBrandFooter(
  ctx: CanvasRenderingContext2D,
  y: number,
  logo: HTMLImageElement | null,
  t: (key: MessageKey) => string
) {
  const label = `${t("common.appName")}  ·  ${t("bills.reportTagline")}`;
  ctx.font = `700 12px ${FONT}`;
  const textWidth = ctx.measureText(label).width;
  const startX = (WIDTH - textWidth - 24) / 2;
  if (logo) ctx.drawImage(logo, startX, y - 14, 18, 18);
  text(ctx, label, startX + 24, y, 12, 700, "#59627e");
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string
) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.fillText(value, x, y);
}

function rightText(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string
) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = "right";
  ctx.fillText(value, x, y);
  ctx.textAlign = "left";
}

function centeredText(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string
) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(value, x, y);
  ctx.textAlign = "left";
}

function trimText(
  ctx: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  size: number,
  weight: number
) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  if (ctx.measureText(value).width <= maxWidth) return value;
  let trimmed = value;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) trimmed = trimmed.slice(0, -1);
  return `${trimmed}…`;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke?: string
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawDocumentIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = "#0f9b8e";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, 19, 24);
  line(ctx, x + 5, y + 9, x + 14, y + 9, "#0f9b8e");
  line(ctx, x + 5, y + 14, x + 14, y + 14, "#0f9b8e");
  line(ctx, x + 5, y + 19, x + 11, y + 19, "#0f9b8e");
}

function drawStatIcon(ctx: CanvasRenderingContext2D, x: number, y: number, index: number) {
  ctx.strokeStyle = "#0f9b8e";
  ctx.lineWidth = 2;
  if (index === 0) {
    ctx.strokeRect(x - 7, y - 9, 14, 18);
    line(ctx, x - 3, y - 3, x + 4, y - 3, "#0f9b8e");
    line(ctx, x - 3, y + 2, x + 4, y + 2, "#0f9b8e");
  } else {
    roundedRect(ctx, x - 10, y - 7, 20, 14, 3, "transparent", "#0f9b8e");
    circle(ctx, x + 5, y, 2, "#0f9b8e");
  }
}

function drawCheck(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.moveTo(x - 8, y);
  ctx.lineTo(x - 2, y + 6);
  ctx.lineTo(x + 9, y - 7);
  ctx.strokeStyle = "#0f9b8e";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.lineCap = "butt";
}
