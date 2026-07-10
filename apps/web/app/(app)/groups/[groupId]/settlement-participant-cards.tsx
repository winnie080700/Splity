"use client";

import { ChevronDown, Clipboard, Download, ReceiptText, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import type {
  ParticipantSettlementBill,
  ParticipantSettlementCard,
  ParticipantPaymentStatus,
  ParticipantSettlementRole,
} from "./settlement-participant-data";

type SettlementParticipantCardsProps = {
  cards: ParticipantSettlementCard[];
};

const roleTone: Record<ParticipantSettlementRole, string> = {
  balanced: "border-[var(--splity-line)] bg-white text-[var(--splity-muted)]",
  payer: "border-red-200 bg-red-50 text-red-700",
  receiver: "border-cyan-200 bg-cyan-50 text-cyan-700",
};

const paymentStatusTone = {
  balanced: "neutral",
  markedPaid: "amber",
  paid: "green",
  pending: "red",
  received: "green",
} satisfies Record<ParticipantPaymentStatus, "amber" | "green" | "neutral" | "red">;

export function SettlementParticipantCards({ cards }: SettlementParticipantCardsProps) {
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const { t } = useTranslation();
  const selectedCard = useMemo(
    () => cards.find((card) => card.participantId === selectedParticipantId) ?? null,
    [cards, selectedParticipantId]
  );

  if (!cards.length) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-[var(--splity-line-strong)] p-8 text-center text-sm font-medium text-[var(--splity-muted)]">
        {t("settlements.everyoneBalanced")}
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <button
            className="group rounded-xl border border-[var(--splity-line)] bg-white p-4 text-left transition hover:border-teal-200 hover:shadow-[0_8px_24px_rgba(12,21,56,0.05)]"
            key={card.participantId}
            onClick={() => setSelectedParticipantId(card.participantId)}
            type="button"
          >
            <span className="flex items-center gap-3">
              <span className="splity-display grid h-12 w-12 shrink-0 place-items-center rounded-full bg-teal-700 text-base font-bold text-white">
                {initials(card.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <strong className="truncate text-sm text-[var(--splity-ink)]">{card.name}</strong>
                  <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-bold ${roleTone[card.role]}`}>
                    {t(roleLabelKey(card.role))}
                  </span>
                </span>
                <span className={[
                  "mt-1 block text-lg font-extrabold",
                  card.role === "receiver" ? "text-emerald-600" : card.role === "payer" ? "text-red-600" : "text-[var(--splity-muted)]",
                ].join(" ")}>
                  {card.netAmount}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>

      {selectedCard ? (
        <ParticipantSettlementModal
          card={selectedCard}
          onClose={() => setSelectedParticipantId(null)}
        />
      ) : null}
    </>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ParticipantSettlementModal({
  card,
  onClose,
}: {
  card: ParticipantSettlementCard;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [expandedBillIds, setExpandedBillIds] = useState<Set<string>>(
    () => new Set(card.bills[0] ? [card.bills[0].id] : [])
  );
  const [exportPreviewUrl, setExportPreviewUrl] = useState<string | null>(null);
  const allExpanded = card.bills.length > 0 && expandedBillIds.size === card.bills.length;

  function toggleBill(billId: string) {
    setExpandedBillIds((current) => {
      const next = new Set(current);
      if (next.has(billId)) next.delete(billId);
      else next.add(billId);
      return next;
    });
  }

  function openExportPreview() {
    const canvas = createParticipantPreviewCanvas(card, expandedBillIds, t);
    if (canvas) setExportPreviewUrl(canvas.toDataURL("image/png"));
  }

  return (
    <>
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="max-w-5xl" showClose={false}>
        <DialogHeader className="mb-5 gap-4 pr-0 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--splity-gold-strong)]">
              {t("settlements.participantSummary")}
            </p>
            <DialogTitle className="mt-1 text-2xl font-extrabold sm:text-3xl">
              {t("settlements.participantTitle").replace("{name}", card.name)}
            </DialogTitle>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone={card.role === "receiver" ? "blue" : card.role === "payer" ? "red" : "neutral"}>
                {t(roleLabelKey(card.role))}
              </Badge>
              <Badge tone={paymentStatusTone[card.paymentStatus]}>
                {t(paymentStatusLabelKey(card.paymentStatus))}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2 sm:justify-end">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--splity-line)] bg-white px-4 text-sm font-bold text-teal-700 transition hover:bg-teal-50"
              onClick={openExportPreview}
              type="button"
            >
              <Download className="h-4 w-4" />
              {t("export.downloadImage")}
            </button>
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--splity-line)] bg-[var(--splity-bg)]/45 text-[var(--splity-muted)] transition hover:bg-white"
              onClick={onClose}
              type="button"
            >
              <span className="sr-only">{t("common.close")}</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <section className={[
          "mb-5 rounded-2xl border p-6",
          card.role === "payer" ? "border-red-200 bg-red-50" : card.role === "receiver" ? "border-emerald-200 bg-emerald-50" : "border-[var(--splity-line)] bg-[var(--splity-bg)]/35",
        ].join(" ")}>
          <div className="flex items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <span className={[
                "splity-display grid h-16 w-16 shrink-0 place-items-center rounded-full text-2xl font-extrabold text-white",
                card.role === "payer" ? "bg-red-500" : "bg-teal-700",
              ].join(" ")}>
                {initials(card.name)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--splity-muted)]">{t(card.role === "payer" ? "settlements.youOwe" : card.role === "receiver" ? "settlements.youReceive" : "settlements.netAmount")}</p>
                <p className="truncate text-2xl font-extrabold text-[var(--splity-ink)]">
                  {card.transfers[0]?.otherName || t("settlements.noTransfers")}
                </p>
                <p className="text-sm font-semibold text-[var(--splity-muted)]">{t("settlements.netAmount")}</p>
              </div>
            </div>
            <p className={[
              "splity-display shrink-0 text-3xl font-extrabold",
              card.role === "payer" ? "text-red-700" : card.role === "receiver" ? "text-emerald-700" : "text-[var(--splity-ink)]",
            ].join(" ")}>
              {card.netAmount}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--splity-line)] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--splity-line)] pb-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
                <ReceiptText className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-extrabold text-[var(--splity-ink)]">
                {t("settlements.involvedBills")}
              </h3>
              <Badge tone="neutral">{t("settlements.cardBillCount").replace("{count}", String(card.billCount))}</Badge>
            </div>
            {card.bills.length ? (
              <button
                aria-expanded={allExpanded}
                className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-teal-700 transition-colors hover:bg-teal-50"
                onClick={() => setExpandedBillIds(allExpanded ? new Set() : new Set(card.bills.map((bill) => bill.id)))}
                type="button"
              >
                {t(allExpanded ? "settlements.collapseAll" : "settlements.expandAll")}
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${allExpanded ? "rotate-180" : ""}`}
                />
              </button>
            ) : null}
          </div>

          {card.bills.length ? (
            <div className="divide-y divide-[var(--splity-line)]">
              {card.bills.map((bill) => (
                <ParticipantBillCard
                  bill={bill}
                  expanded={expandedBillIds.has(bill.id)}
                  key={bill.id}
                  onToggle={() => toggleBill(bill.id)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-[var(--splity-line-strong)] p-5 text-sm font-semibold text-[var(--splity-muted)]">
              {t("settlements.noParticipantBills")}
            </p>
          )}

          <div className="mt-4 flex items-end justify-between gap-4 rounded-xl bg-teal-50 px-4 py-3">
            <div>
              <p className="font-extrabold text-teal-800">{t("settlements.totalOfYourShares")}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--splity-muted)]">
                {t("settlements.fromBillCount").replace("{count}", String(card.billCount))}
              </p>
            </div>
            <p className="splity-display text-2xl font-extrabold text-teal-700">{shareTotal(card.bills)}</p>
          </div>
        </section>
      </DialogContent>
    </Dialog>
    <Dialog
      onOpenChange={(open) => !open && setExportPreviewUrl(null)}
      open={Boolean(exportPreviewUrl)}
    >
      <DialogContent className="flex max-w-5xl flex-col !overflow-y-hidden">
        <DialogHeader>
          <DialogTitle>{t("export.previewTitle")}</DialogTitle>
          <DialogDescription>{t("export.previewBody")}</DialogDescription>
        </DialogHeader>
        {exportPreviewUrl ? (
          <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-[var(--splity-line)] bg-[var(--splity-bg)] p-3 sm:p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={t("export.previewTitle")}
              className="mx-auto h-auto w-full max-w-4xl rounded-xl shadow-sm"
              src={exportPreviewUrl}
            />
          </div>
        ) : null}
        <DialogFooter className="w-full border-t border-[var(--splity-line)] pt-5">
          <Button
            className="sm:min-w-40"
            onClick={() => exportPreviewUrl && copyParticipantImage(exportPreviewUrl, t)}
            type="button"
            variant="secondary"
          >
            <Clipboard className="h-4 w-4" />
            {t("export.copyImage")}
          </Button>
          <Button
            className="sm:min-w-40"
            onClick={() => exportPreviewUrl && downloadParticipantImage(exportPreviewUrl, card.name, t)}
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

function ParticipantBillCard({
  bill,
  expanded,
  onToggle,
}: {
  bill: ParticipantSettlementBill;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();

  return (
    <article className="py-4">
      <button
        aria-expanded={expanded}
        className="grid w-full gap-4 rounded-xl p-2 text-left transition-colors hover:bg-[var(--splity-bg)]/45 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
        onClick={onToggle}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
            <ReceiptText className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-extrabold text-[var(--splity-ink)]">{bill.storeName}</span>
            <span className="mt-1 block truncate text-xs font-semibold text-[var(--splity-muted)]">
              {bill.date} · {t("settlements.paidBy").replace("{name}", bill.payer || t("groupDetail.unknown"))}
            </span>
          </span>
        </span>
        <span className="text-left sm:text-right">
          <span className="block text-xs font-semibold text-[var(--splity-muted)]">{t("settlements.yourShare")}</span>
          <span className="mt-1 block font-mono text-lg font-extrabold text-[var(--splity-navy)]">{bill.participantShare}</span>
          <span className="block text-xs font-semibold text-[var(--splity-muted)]">
            {t("settlements.ofBillTotal").replace("{amount}", bill.total)}
          </span>
        </span>
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--splity-line)] bg-white text-[var(--splity-ink)]">
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      <div
        className={[
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="min-h-0 overflow-hidden">
        <div className="mx-2 mt-2 overflow-x-auto border-t border-[var(--splity-line)]">
          <div className="hidden min-w-[560px] grid-cols-[minmax(0,1fr)_minmax(170px,0.7fr)_auto] gap-4 border-b border-[var(--splity-line)] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--splity-muted)] sm:grid">
            <span>{t("bills.description")}</span>
            <span>{t("bills.responsibleParticipants")}</span>
            <span className="text-right">{t("groupDetail.amount")}</span>
          </div>
          {bill.items.map((item) => (
            <div
              className={[
                "grid gap-2 border-b border-[var(--splity-line)] px-3 py-3 last:border-0 sm:min-w-[560px] sm:grid-cols-[minmax(0,1fr)_minmax(170px,0.7fr)_auto] sm:items-center sm:gap-4",
                item.involved ? "text-[var(--splity-ink)]" : "text-[var(--splity-muted)]",
              ].join(" ")}
              key={`${bill.id}-${item.description}`}
            >
              <p className="font-bold">{item.description}</p>
              <p className="text-xs font-semibold text-[var(--splity-muted)]">
                {item.participants.join(", ") || t("bills.none")}
              </p>
              <p className="font-mono font-extrabold text-[var(--splity-navy)] sm:text-right">{item.amount}</p>
            </div>
          ))}
        </div>
        </div>
      </div>
    </article>
  );
}

function shareTotal(bills: ParticipantSettlementBill[]) {
  const prefix = bills[0]?.participantShare.match(/^[^\d-]+/)?.[0] ?? "";
  const total = bills.reduce((sum, bill) => sum + Number(bill.participantShare.replace(/[^0-9.-]/g, "")), 0);
  return `${prefix}${total.toFixed(2)}`;
}

function roleLabelKey(role: ParticipantSettlementRole): MessageKey {
  if (role === "payer") return "settlements.role.payer";
  if (role === "receiver") return "settlements.role.receiver";
  return "settlements.role.balanced";
}

function paymentStatusLabelKey(status: ParticipantPaymentStatus): MessageKey {
  if (status === "pending") return "settlements.paymentStatus.pending";
  if (status === "markedPaid") return "settlements.paymentStatus.markedPaid";
  if (status === "paid") return "settlements.paymentStatus.paid";
  if (status === "received") return "settlements.paymentStatus.received";
  return "settlements.paymentStatus.balanced";
}

function createParticipantPreviewCanvas(
  card: ParticipantSettlementCard,
  expandedBillIds: Set<string>,
  t: (key: MessageKey) => string
) {
  const width = 1080;
  const bills = card.bills.length
    ? card.bills
    : [{
        date: "",
        id: "empty",
        items: [],
        payer: "",
        participantShare: "",
        storeName: t("settlements.noParticipantBills"),
        total: "",
      }];
  const billsHeight = bills.reduce(
    (sum, bill) => sum + 92 + (expandedBillIds.has(bill.id) ? 36 + bill.items.length * 48 : 0),
    0
  );
  const height = 500 + billsHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#f2f1ec";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 40, 40, width - 80, height - 80, 26);
  ctx.fill();

  const accent = card.role === "payer" ? "#dc2626" : card.role === "receiver" ? "#047857" : "#64748b";
  ctx.fillStyle = accent;
  roundRect(ctx, 72, 72, 120, 34, 17);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 13px Arial";
  ctx.fillText(t(roleLabelKey(card.role)).toUpperCase(), 92, 94);

  ctx.fillStyle = "#0c1538";
  ctx.font = "800 32px Arial";
  ctx.fillText(t("settlements.participantTitle").replace("{name}", card.name), 72, 140);

  ctx.fillStyle = card.role === "payer" ? "#fff1f2" : card.role === "receiver" ? "#ecfdf5" : "#f8fafc";
  roundRect(ctx, 72, 170, width - 144, 120, 18);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(122, 230, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 22px Arial";
  ctx.textAlign = "center";
  ctx.fillText(initials(card.name), 122, 238);
  ctx.textAlign = "left";
  ctx.fillStyle = "#5f6681";
  ctx.font = "700 13px Arial";
  ctx.fillText(t(card.role === "payer" ? "settlements.youOwe" : card.role === "receiver" ? "settlements.youReceive" : "settlements.netAmount"), 174, 206);
  ctx.fillStyle = "#0c1538";
  ctx.font = "800 24px Arial";
  ctx.fillText(trimText(ctx, card.transfers[0]?.otherName || card.name, 420), 174, 238);
  ctx.fillStyle = "#5f6681";
  ctx.font = "700 13px Arial";
  ctx.fillText(t("settlements.netAmount"), 174, 264);
  ctx.fillStyle = accent;
  ctx.font = "800 34px Arial";
  ctx.textAlign = "right";
  ctx.fillText(card.netAmount, width - 96, 240);
  ctx.textAlign = "left";

  let cursorY = 342;
  ctx.fillStyle = "#0c1538";
  ctx.font = "800 22px Arial";
  ctx.fillText(t("settlements.involvedBills"), 72, cursorY);
  ctx.fillStyle = "#5f6681";
  ctx.font = "700 13px Arial";
  ctx.fillText(t("settlements.cardBillCount").replace("{count}", String(card.billCount)), 272, cursorY);
  cursorY += 28;

  bills.forEach((bill) => {
    ctx.strokeStyle = "#dce8e6";
    ctx.beginPath();
    ctx.moveTo(72, cursorY);
    ctx.lineTo(width - 72, cursorY);
    ctx.stroke();
    cursorY += 30;
    ctx.fillStyle = "#0c1538";
    ctx.font = "800 20px Arial";
    ctx.fillText(trimText(ctx, bill.storeName, 420), 96, cursorY);
    ctx.fillStyle = "#5f6681";
    ctx.font = "700 12px Arial";
    ctx.fillText(`${bill.date} · ${t("settlements.paidBy").replace("{name}", bill.payer || t("groupDetail.unknown"))}`, 96, cursorY + 24);
    ctx.textAlign = "right";
    ctx.fillText(t("settlements.yourShare"), width - 96, cursorY - 12);
    ctx.fillStyle = "#0c1538";
    ctx.font = "800 19px Arial";
    ctx.fillText(bill.participantShare, width - 96, cursorY + 12);
    ctx.fillStyle = "#5f6681";
    ctx.font = "700 12px Arial";
    ctx.fillText(t("settlements.ofBillTotal").replace("{amount}", bill.total), width - 96, cursorY + 32);
    ctx.textAlign = "left";
    cursorY += 62;

    if (expandedBillIds.has(bill.id)) {
      ctx.fillStyle = "#5f6681";
      ctx.font = "800 10px Arial";
      ctx.fillText(t("bills.description").toUpperCase(), 96, cursorY);
      ctx.fillText(t("bills.responsibleParticipants").toUpperCase(), 560, cursorY);
      ctx.textAlign = "right";
      ctx.fillText(t("groupDetail.amount").toUpperCase(), width - 96, cursorY);
      ctx.textAlign = "left";
      cursorY += 24;
      bill.items.forEach((item) => {
        ctx.strokeStyle = "#edf2f1";
        ctx.beginPath();
        ctx.moveTo(96, cursorY + 30);
        ctx.lineTo(width - 96, cursorY + 30);
        ctx.stroke();
        ctx.fillStyle = item.involved ? "#0c1538" : "#7b8197";
        ctx.font = "700 14px Arial";
        ctx.fillText(trimText(ctx, item.description, 420), 96, cursorY + 16);
        ctx.fillStyle = "#5f6681";
        ctx.font = "700 12px Arial";
        ctx.fillText(trimText(ctx, item.participants.join(", ") || t("bills.none"), 300), 560, cursorY + 16);
        ctx.fillStyle = "#0c1538";
        ctx.font = "800 14px Arial";
        ctx.textAlign = "right";
        ctx.fillText(item.amount, width - 96, cursorY + 16);
        ctx.textAlign = "left";
        cursorY += 48;
      });
    }
  });

  ctx.fillStyle = "#e6f6f3";
  roundRect(ctx, 72, cursorY + 18, width - 144, 74, 14);
  ctx.fill();
  ctx.fillStyle = "#0f766e";
  ctx.font = "800 17px Arial";
  ctx.fillText(t("settlements.totalOfYourShares"), 96, cursorY + 50);
  ctx.fillStyle = "#5f6681";
  ctx.font = "700 12px Arial";
  ctx.fillText(t("settlements.fromBillCount").replace("{count}", String(card.billCount)), 96, cursorY + 72);
  ctx.fillStyle = "#0f766e";
  ctx.font = "800 25px Arial";
  ctx.textAlign = "right";
  ctx.fillText(shareTotal(card.bills), width - 96, cursorY + 62);
  ctx.textAlign = "left";

  return canvas;
}

async function copyParticipantImage(url: string, t: (key: MessageKey) => string) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    toast.error(t("export.copyUnsupported"));
    return;
  }
  try {
    const blob = await fetch(url).then((response) => response.blob());
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    toast.success(t("export.copied"));
  } catch {
    toast.error(t("export.copyUnsupported"));
  }
}

function downloadParticipantImage(
  url: string,
  name: string,
  t: (key: MessageKey) => string
) {
  const link = document.createElement("a");
  link.download = `${name}-settlement.png`;
  link.href = url;
  link.click();
  toast.success(t("settlements.participantPngReady"));
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
