import type { ParticipantNetBalanceDto, SettlementTransferDto } from "@api-client";
import { type SettlementReceiptData } from "@/features/settlements/receipt";
import { type SettlementShareReceiverPaymentInfo } from "@/features/settlements/share";

type SummaryImageOptions = {
  fileName: string;
  groupName: string;
  subtitle: string;
  balances: ParticipantNetBalanceDto[];
  transfers: SettlementTransferDto[];
  receiverPaymentInfos?: SettlementShareReceiverPaymentInfo[];
  statusLabel: (status: number) => string;
  formatCurrency: (amount: number) => string;
};

type SummaryRow = { left: string; right: string };
type SummarySection = {
  title: string;
  rows: SummaryRow[];
  headerRightText?: string;
  headerRightColor?: string;
  headerRightPillText?: string;
  headerRightPillBackground?: string;
  headerRightPillColor?: string;
};

const WIDTH = 1400;
const PADDING_X = 92;
const HEADER_HEIGHT = 236;
const SECTION_GAP = 32;
const ROW_HEIGHT = 58;
const FOOTER_PADDING = 72;

export async function downloadSettlementSummaryImage(options: SummaryImageOptions) {
  if (typeof document === "undefined") {
    throw new Error("image-download-unavailable");
  }

  const canvas = document.createElement("canvas");
  const balancesHeight = getSectionHeight(options.balances.length);
  const transfersHeight = getSectionHeight(options.transfers.length > 0 ? options.transfers.length : 1);
  const receiverPaymentSections = buildReceiverPaymentSections(
    options.transfers,
    options.balances,
    options.receiverPaymentInfos ?? []
  );
  const receiverPaymentHeight = receiverPaymentSections.length > 0
    ? SECTION_GAP + receiverPaymentSections.reduce((sum, section) => sum + getSectionHeight(section.rows.length), 0) +
      (receiverPaymentSections.length - 1) * SECTION_GAP
    : 0;
  const totalHeight = HEADER_HEIGHT + balancesHeight + transfersHeight + SECTION_GAP + receiverPaymentHeight + FOOTER_PADDING;

  canvas.width = WIDTH;
  canvas.height = totalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("image-download-unavailable");
  }

  context.fillStyle = "#f7f4ed";
  context.fillRect(0, 0, WIDTH, totalHeight);
  drawHeader(context, options.groupName, options.subtitle);

  let currentY = HEADER_HEIGHT;
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

  if (receiverPaymentSections.length > 0) {
    currentY += SECTION_GAP + transfersHeight;
    receiverPaymentSections.forEach((section, index) => {
      currentY = drawSection(context, currentY, section.title, section.rows);
      if (index < receiverPaymentSections.length - 1) {
        currentY += SECTION_GAP;
      }
    });
  }

  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = options.fileName;
  link.click();
}

export async function downloadReceiptImage(options: {
  fileName: string;
  participantId: string;
  participantName: string;
  receipt: SettlementReceiptData;
  balances: ParticipantNetBalanceDto[];
  transfers: SettlementTransferDto[];
  receiverPaymentInfos?: SettlementShareReceiverPaymentInfo[];
  formatCurrency: (amount: number) => string;
}) {
  if (typeof document === "undefined") {
    throw new Error("image-download-unavailable");
  }

  const canvas = document.createElement("canvas");
  const sectionHeights = options.receipt.bills.map((bill) => getSectionHeight(bill.lines.length + 1));
  const receiverPaymentSections = buildOutgoingReceiverPaymentSections(
    options.participantId,
    options.transfers,
    options.balances,
    options.receiverPaymentInfos ?? []
  );
  const receiverPaymentHeight = receiverPaymentSections.length > 0
    ? SECTION_GAP + receiverPaymentSections.reduce((sum, section) => sum + getSectionHeight(section.rows.length), 0) +
      (receiverPaymentSections.length - 1) * SECTION_GAP
    : 0;
  const billAreaHeight = sectionHeights.length > 0
    ? sectionHeights.reduce((sum, height) => sum + height, 0) + (sectionHeights.length - 1) * SECTION_GAP
    : getSectionHeight(1);
  const totalHeight = HEADER_HEIGHT + billAreaHeight + SECTION_GAP + getSectionHeight(1) + receiverPaymentHeight + FOOTER_PADDING;

  canvas.width = WIDTH;
  canvas.height = totalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("image-download-unavailable");
  }

  context.fillStyle = "#f7f4ed";
  context.fillRect(0, 0, WIDTH, totalHeight);
  drawHeader(context, options.participantName, "Receipt details");

  let currentY = HEADER_HEIGHT;
  if (options.receipt.bills.length === 0) {
    currentY = drawSection(context, currentY, "Bills", [{ left: "No bill details", right: "-" }]);
  }
  else {
    options.receipt.bills.forEach((bill, index) => {
      currentY = drawSection(
        context,
        currentY,
        `${bill.storeName} · ${new Intl.DateTimeFormat("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }).format(new Date(bill.transactionDateUtc))}`,
        [
          ...bill.lines.map((line) => ({
            left: line.label,
            right: formatSignedCurrency(line.amount, options.formatCurrency)
          })),
          {
            left: "Bill total",
            right: formatSignedCurrency(bill.totalAmount, options.formatCurrency)
          }
        ]
      );

      if (index < options.receipt.bills.length - 1) {
        currentY += SECTION_GAP;
      }
    });
  }

  currentY = drawSection(context, currentY + SECTION_GAP, "Grand total", [
    {
      left: "Total",
      right: options.formatCurrency(options.receipt.grandTotal)
    }
  ]);

  if (receiverPaymentSections.length > 0) {
    currentY += SECTION_GAP;
    receiverPaymentSections.forEach((section, index) => {
      currentY = drawSection(context, currentY, section.title, section.rows);
      if (index < receiverPaymentSections.length - 1) {
        currentY += SECTION_GAP;
      }
    });
  }

  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = options.fileName;
  link.click();
}

export async function downloadAllReceiptsImage(options: {
  fileName: string;
  groupName: string;
  participants: Array<{
    participantId: string;
    participantName: string;
    receipt: SettlementReceiptData;
  }>;
  balances: ParticipantNetBalanceDto[];
  transfers: SettlementTransferDto[];
  receiverPaymentInfos?: SettlementShareReceiverPaymentInfo[];
  formatCurrency: (amount: number) => string;
}) {
  if (typeof document === "undefined") {
    throw new Error("image-download-unavailable");
  }

  const includedParticipants = options.participants.filter((participant) => participant.receipt.bills.length > 0);
  const sections: SummarySection[] = includedParticipants.length > 0
    ? includedParticipants.map((participant) => {
      const participantNetAmount = options.balances.find((entry) => entry.participantId === participant.participantId)?.netAmount ?? 0;
      const participantSummary = formatParticipantNetAmount(participantNetAmount, options.formatCurrency);

      return {
        title: participant.participantName,
        rows: [
          ...participant.receipt.bills.map((bill) => ({
            left: `${bill.storeName} · ${new Intl.DateTimeFormat("en-MY", {
              day: "numeric",
              month: "short",
              year: "numeric"
            }).format(new Date(bill.transactionDateUtc))}`,
            right: formatSignedCurrency(bill.totalAmount, options.formatCurrency)
          })),
          {
            left: "Grand total",
            right: options.formatCurrency(participant.receipt.grandTotal)
          }
        ],
        headerRightText: participantSummary.text,
        headerRightColor: participantSummary.color,
        ...formatParticipantPaymentStatus(participant.participantId, participantNetAmount, options.transfers)
      };
    })
    : [{
      title: "Receipts",
      rows: [{ left: "No receipt details", right: "-" }]
    }];
  const receiverPaymentSections: SummarySection[] = buildReceiverPaymentSections(
    options.transfers,
    options.balances,
    options.receiverPaymentInfos ?? []
  );
  const allSections: SummarySection[] = [
    ...sections,
    ...receiverPaymentSections
  ];

  const contentHeight = allSections.reduce((sum, section) => sum + getSectionHeight(section.rows.length), 0) + (allSections.length - 1) * SECTION_GAP;
  const totalHeight = HEADER_HEIGHT + contentHeight + FOOTER_PADDING;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = totalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("image-download-unavailable");
  }

  context.fillStyle = "#f7f4ed";
  context.fillRect(0, 0, WIDTH, totalHeight);
  drawHeader(context, options.groupName, "Settlement receipts");

  let currentY = HEADER_HEIGHT;
  allSections.forEach((section, index) => {
    currentY = drawSection(
      context,
      currentY,
      section.title,
      section.rows,
      section.headerRightText,
      section.headerRightColor,
      section.headerRightPillText,
      section.headerRightPillBackground,
      section.headerRightPillColor
    );
    if (index < allSections.length - 1) {
      currentY += SECTION_GAP;
    }
  });

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
  rows: Array<{ left: string; right: string }>,
  headerRightText?: string,
  headerRightColor?: string,
  headerRightPillText?: string,
  headerRightPillBackground?: string,
  headerRightPillColor?: string
) {
  const sectionHeight = getSectionHeight(rows.length);
  let titleMaxWidth = WIDTH - PADDING_X * 2;
  let headerRightTotalWidth = 0;

  if (headerRightText) {
    context.font = "600 34px Manrope, Arial, sans-serif";
    const headerRightWidth = context.measureText(headerRightText).width;
    headerRightTotalWidth += headerRightWidth;
  }

  if (headerRightPillText) {
    context.font = "700 18px Manrope, Arial, sans-serif";
    headerRightTotalWidth += getHeaderPillWidth(context, headerRightPillText);
  }

  if (headerRightTotalWidth > 0) {
    const gap = headerRightText && headerRightPillText ? 18 : 0;
    titleMaxWidth -= headerRightTotalWidth + gap + 36;
  }

  context.fillStyle = "#1c1a16";
  context.font = "600 42px Georgia, 'Times New Roman', serif";
  context.fillText(fitText(context, title, titleMaxWidth), PADDING_X, startY + 46);

  if (headerRightText) {
    context.font = "600 34px Manrope, Arial, sans-serif";
    const headerRightWidth = context.measureText(headerRightText).width;
    const textX = WIDTH - PADDING_X - headerRightWidth;

    if (headerRightPillText) {
      context.font = "700 18px Manrope, Arial, sans-serif";
      const pillWidth = getHeaderPillWidth(context, headerRightPillText);
      drawHeaderPill(
        context,
        textX - pillWidth - 18,
        startY + 16,
        headerRightPillText,
        headerRightPillBackground ?? "#d8f3ea",
        headerRightPillColor ?? "#0b6b57"
      );
    }

    context.fillStyle = headerRightColor ?? "#161616";
    context.font = "600 34px Manrope, Arial, sans-serif";
    context.fillText(headerRightText, textX, startY + 44);
  }

  context.strokeStyle = "#d8cfbe";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(PADDING_X, startY + 70);
  context.lineTo(WIDTH - PADDING_X, startY + 70);
  context.stroke();

  let rowY = startY + 122;
  rows.forEach((row) => {
    context.strokeStyle = "#ece6d8";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(PADDING_X, rowY + 22);
    context.lineTo(WIDTH - PADDING_X, rowY + 22);
    context.stroke();

    context.fillStyle = "#3a352d";
    context.font = "600 24px Manrope, Arial, sans-serif";
    context.fillText(fitText(context, row.left, WIDTH * 0.48), PADDING_X, rowY);

    context.fillStyle = "#161616";
    context.font = "600 24px Manrope, Arial, sans-serif";
    const rightText = fitText(context, row.right, WIDTH * 0.42);
    const rightWidth = context.measureText(rightText).width;
    context.fillText(rightText, WIDTH - PADDING_X - rightWidth, rowY);
    rowY += ROW_HEIGHT;
  });

  return startY + sectionHeight;
}

function drawHeader(context: CanvasRenderingContext2D, title: string, subtitle: string) {
  context.fillStyle = "#161616";
  context.font = "600 64px Georgia, 'Times New Roman', serif";
  context.fillText(fitText(context, title, WIDTH - PADDING_X * 2), PADDING_X, 104);

  context.strokeStyle = "#cfc5b3";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(PADDING_X, 132);
  context.lineTo(WIDTH - PADDING_X, 132);
  context.stroke();

  context.fillStyle = "#6a6257";
  context.font = "500 24px Manrope, Arial, sans-serif";
  context.fillText(fitText(context, subtitle, WIDTH - PADDING_X * 2), PADDING_X, 188);
}

function getSectionHeight(rowsCount: number) {
  return 104 + Math.max(rowsCount, 1) * ROW_HEIGHT;
}

function buildReceiverPaymentSections(
  transfers: SettlementTransferDto[],
  balances: ParticipantNetBalanceDto[],
  receiverPaymentInfos: SettlementShareReceiverPaymentInfo[]
) {
  const seen = new Set<string>();

  return transfers
    .filter((transfer) => {
      if (seen.has(transfer.toParticipantId)) {
        return false;
      }

      seen.add(transfer.toParticipantId);
      return true;
    })
    .map((transfer) => {
      const receiverName = findParticipantName(balances, transfer.toParticipantId);
      const receiverInfo = receiverPaymentInfos.find((entry) => entry.participantId === transfer.toParticipantId)?.paymentInfo;
      const rows = [
        receiverInfo?.payeeName ? { left: "Payee name", right: receiverInfo.payeeName } : null,
        receiverInfo?.paymentMethod ? { left: "Payment method", right: receiverInfo.paymentMethod } : null,
        receiverInfo?.accountName ? { left: "Account name", right: receiverInfo.accountName } : null,
        receiverInfo?.accountNumber ? { left: "Account number", right: receiverInfo.accountNumber } : null,
        receiverInfo?.notes ? { left: "Notes", right: receiverInfo.notes } : null,
        receiverInfo?.paymentQrDataUrl ? { left: "Payment QR", right: "Provided" } : null
      ].filter((row): row is { left: string; right: string } => row !== null);

      return {
        title: `${receiverName} payment details`,
        rows: rows.length > 0
          ? rows
          : [{ left: "Payment details", right: "Not provided. Ask receiver." }]
      };
    });
}

function buildOutgoingReceiverPaymentSections(
  participantId: string,
  transfers: SettlementTransferDto[],
  balances: ParticipantNetBalanceDto[],
  receiverPaymentInfos: SettlementShareReceiverPaymentInfo[]
) {
  const seen = new Set<string>();

  return transfers
    .filter((transfer) => transfer.fromParticipantId === participantId)
    .filter((transfer) => {
      if (seen.has(transfer.toParticipantId)) {
        return false;
      }

      seen.add(transfer.toParticipantId);
      return true;
    })
    .map((transfer) => buildReceiverPaymentSection(
      findParticipantName(balances, transfer.toParticipantId),
      receiverPaymentInfos.find((entry) => entry.participantId === transfer.toParticipantId) ?? null
    ));
}

function buildReceiverPaymentSection(
  receiverName: string,
  receiverPaymentInfo: SettlementShareReceiverPaymentInfo | null
): SummarySection {
  const paymentInfo = receiverPaymentInfo?.paymentInfo;
  const rows = [
    paymentInfo?.payeeName ? { left: "Payee name", right: paymentInfo.payeeName } : null,
    paymentInfo?.paymentMethod ? { left: "Payment method", right: paymentInfo.paymentMethod } : null,
    paymentInfo?.accountName ? { left: "Account name", right: paymentInfo.accountName } : null,
    paymentInfo?.accountNumber ? { left: "Account number", right: paymentInfo.accountNumber } : null,
    paymentInfo?.notes ? { left: "Notes", right: paymentInfo.notes } : null,
    paymentInfo?.paymentQrDataUrl ? { left: "Payment QR", right: "Provided" } : null
  ].filter((row): row is SummaryRow => row !== null);

  return {
    title: `${receiverName} payment details`,
    rows: rows.length > 0
      ? rows
      : [{ left: "Payment details", right: "Not provided. Ask receiver." }]
  };
}

function formatParticipantNetAmount(
  netAmount: number,
  formatCurrency: (amount: number) => string
) {
  if (netAmount > 0) {
    return {
      text: formatCurrency(netAmount),
      color: "#0f9fa8"
    };
  }

  if (netAmount < 0) {
    return {
      text: formatCurrency(Math.abs(netAmount)),
      color: "#d14343"
    };
  }

  return {
    text: formatCurrency(0),
    color: "#161616"
  };
}

function formatParticipantPaymentStatus(
  participantId: string,
  netAmount: number,
  transfers: SettlementTransferDto[]
) {
  if (netAmount >= 0) {
    return {};
  }

  const outgoingTransfers = transfers.filter((transfer) => transfer.fromParticipantId === participantId);
  if (outgoingTransfers.length === 0) {
    return {};
  }

  const isPaid = outgoingTransfers.every((transfer) => transfer.status !== 0);
  return {
    headerRightPillText: isPaid ? "Paid" : "Unpaid",
    headerRightPillBackground: isPaid ? "#d8f3ea" : "#fde7b0",
    headerRightPillColor: isPaid ? "#0b6b57" : "#9a6700"
  };
}

function getHeaderPillWidth(context: CanvasRenderingContext2D, text: string) {
  return context.measureText(text).width + 28;
}

function drawHeaderPill(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  background: string,
  color: string
) {
  context.font = "700 18px Manrope, Arial, sans-serif";
  const pillWidth = getHeaderPillWidth(context, text);
  const pillHeight = 34;
  const radius = pillHeight / 2;

  context.fillStyle = background;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + pillWidth - radius, y);
  context.quadraticCurveTo(x + pillWidth, y, x + pillWidth, y + radius);
  context.lineTo(x + pillWidth, y + pillHeight - radius);
  context.quadraticCurveTo(x + pillWidth, y + pillHeight, x + pillWidth - radius, y + pillHeight);
  context.lineTo(x + radius, y + pillHeight);
  context.quadraticCurveTo(x, y + pillHeight, x, y + pillHeight - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fill();

  context.fillStyle = color;
  context.textBaseline = "middle";
  context.fillText(text, x + 14, y + pillHeight / 2);
  context.textBaseline = "alphabetic";
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  const ellipsis = "...";
  let output = text;
  while (output.length > 0 && context.measureText(`${output}${ellipsis}`).width > maxWidth) {
    output = output.slice(0, -1);
  }

  return output.length > 0 ? `${output}${ellipsis}` : ellipsis;
}

function findParticipantName(balances: ParticipantNetBalanceDto[], participantId: string) {
  return balances.find((balance) => balance.participantId === participantId)?.participantName ?? participantId;
}

function formatSignedCurrency(value: number, formatCurrency: (amount: number) => string) {
  return value < 0 ? `- ${formatCurrency(Math.abs(value))}` : formatCurrency(value);
}
