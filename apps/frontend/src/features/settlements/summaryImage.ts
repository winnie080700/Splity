import type { ParticipantNetBalanceDto, SettlementTransferDto } from "@api-client";

type SummaryImageOptions = {
  fileName: string;
  groupName: string;
  subtitle: string;
  balances: ParticipantNetBalanceDto[];
  transfers: SettlementTransferDto[];
  statusLabel: (status: number) => string;
  formatCurrency: (amount: number) => string;
};

const WIDTH = 1400;
const PADDING_X = 92;
const HEADER_HEIGHT = 240;
const SECTION_GAP = 36;
const ROW_HEIGHT = 58;

export async function downloadSettlementSummaryImage(options: SummaryImageOptions) {
  if (typeof document === "undefined") {
    throw new Error("image-download-unavailable");
  }

  const canvas = document.createElement("canvas");
  const balancesHeight = Math.max(200, options.balances.length * ROW_HEIGHT + 96);
  const transfersHeight = Math.max(220, options.transfers.length * ROW_HEIGHT + 110);
  const totalHeight = HEADER_HEIGHT + balancesHeight + transfersHeight + SECTION_GAP * 3;

  canvas.width = WIDTH;
  canvas.height = totalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("image-download-unavailable");
  }

  context.fillStyle = "#f7f4ed";
  context.fillRect(0, 0, WIDTH, totalHeight);

  context.fillStyle = "#afbe93";
  roundRect(context, PADDING_X, 132, WIDTH - PADDING_X * 2, 132, 24);
  context.fill();

  context.fillStyle = "#161616";
  roundRect(context, PADDING_X + 120, 72, WIDTH - (PADDING_X + 120) * 2, 176, 28);
  context.fill();

  context.fillStyle = "#161616";
  context.font = "600 84px Georgia, 'Times New Roman', serif";
  context.fillText(options.groupName, PADDING_X, 92);

  context.fillStyle = "#7e776a";
  context.font = "500 26px Manrope, Arial, sans-serif";
  context.fillText(options.subtitle, PADDING_X, 292);

  let currentY = 360;
  currentY = drawSection(
    context,
    currentY,
    "Net balances",
    options.balances.map((balance) => ({
      left: balance.participantName,
      right: options.formatCurrency(balance.netAmount)
    }))
  );

  drawSection(
    context,
    currentY + SECTION_GAP,
    "Transfers",
    options.transfers.length > 0
      ? options.transfers.map((transfer) => ({
          left: `${findParticipantName(options.balances, transfer.fromParticipantId)} -> ${findParticipantName(options.balances, transfer.toParticipantId)}`,
          right: `${options.formatCurrency(transfer.amount)} · ${options.statusLabel(transfer.status)}`
        }))
      : [{ left: "No transfers", right: "-" }]
  );

  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = options.fileName;
  link.click();
}

function drawSection(
  context: CanvasRenderingContext2D,
  startY: number,
  title: string,
  rows: Array<{ left: string; right: string }>
) {
  const sectionHeight = Math.max(180, rows.length * ROW_HEIGHT + 88);
  context.fillStyle = "rgba(255,255,255,0.92)";
  context.strokeStyle = "#e5dfd2";
  context.lineWidth = 2;
  roundRect(context, PADDING_X, startY, WIDTH - PADDING_X * 2, sectionHeight, 28);
  context.fill();
  context.stroke();

  context.fillStyle = "#1c1a16";
  context.font = "600 52px Georgia, 'Times New Roman', serif";
  context.fillText(title, PADDING_X + 36, startY + 64);

  let rowY = startY + 108;
  rows.forEach((row) => {
    context.strokeStyle = "#ece6d8";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(PADDING_X + 36, rowY + 28);
    context.lineTo(WIDTH - PADDING_X - 36, rowY + 28);
    context.stroke();

    context.fillStyle = "#3a352d";
    context.font = "600 24px Manrope, Arial, sans-serif";
    context.fillText(row.left, PADDING_X + 36, rowY);

    context.fillStyle = "#161616";
    context.font = "600 24px Manrope, Arial, sans-serif";
    const rightWidth = context.measureText(row.right).width;
    context.fillText(row.right, WIDTH - PADDING_X - 36 - rightWidth, rowY);
    rowY += ROW_HEIGHT;
  });

  return startY + sectionHeight;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function findParticipantName(balances: ParticipantNetBalanceDto[], participantId: string) {
  return balances.find((balance) => balance.participantId === participantId)?.participantName ?? participantId;
}
