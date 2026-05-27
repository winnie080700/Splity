"use client";

import { ArrowDownLeft, ArrowUpRight, Download, ReceiptText, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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

const roleStripe: Record<ParticipantSettlementRole, string> = {
  balanced: "bg-[var(--splity-line-strong)]",
  payer: "bg-red-500",
  receiver: "bg-cyan-500",
};

const paymentStatusTone = {
  balanced: "neutral",
  markedPaid: "amber",
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
      <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <button
            className="group overflow-hidden rounded-2xl border border-[var(--splity-line)] bg-white text-left shadow-[0_18px_45px_rgba(12,21,56,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(12,21,56,0.1)]"
            key={card.participantId}
            onClick={() => setSelectedParticipantId(card.participantId)}
            type="button"
          >
            <span className={`block h-1.5 ${roleStripe[card.role]}`} />
            <span className="grid gap-4 p-4">
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-lg font-extrabold text-[var(--splity-ink)]">
                    {card.name}
                  </span>
                  <span className="mt-1 block text-xs font-bold uppercase tracking-[0.14em] text-[var(--splity-muted)]">
                    {t("settlements.participantSummary")}
                  </span>
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${roleTone[card.role]}`}>
                  {t(roleLabelKey(card.role))}
                </span>
              </span>
              <span className="flex items-center justify-between gap-3 rounded-xl bg-[var(--splity-bg)]/45 px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--splity-muted)]">
                  {t("settlements.paymentStatus")}
                </span>
                <Badge tone={paymentStatusTone[card.paymentStatus]}>
                  {t(paymentStatusLabelKey(card.paymentStatus))}
                </Badge>
              </span>
              <span className="flex items-end justify-between gap-3">
                <span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--splity-muted)]">
                    {t("settlements.netAmount")}
                  </span>
                  <span className="splity-display mt-1 block text-2xl font-extrabold text-[var(--splity-navy)]">
                    {card.netAmount}
                  </span>
                </span>
                <span className="text-right text-xs font-bold text-[var(--splity-muted)]">
                  <span className="block">
                    {t("settlements.cardBillCount").replace("{count}", String(card.billCount))}
                  </span>
                  <span className="block">
                    {t("settlements.cardTransferCount").replace("{count}", String(card.transferCount))}
                  </span>
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

function ParticipantSettlementModal({
  card,
  onClose,
}: {
  card: ParticipantSettlementCard;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(12,21,56,0.36)] px-4 py-6 backdrop-blur-sm splity-modal-backdrop">
      <div className="mx-auto w-full max-w-5xl rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_28px_100px_rgba(12,21,56,0.32)] splity-modal-panel sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-[var(--splity-line)] pb-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--splity-gold-strong)]">
              {t("groupDetail.settlementPlan")}
            </p>
            <h2 className="splity-display mt-1 text-3xl font-extrabold text-[var(--splity-ink)]">
              {card.name}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--splity-line)] bg-[var(--splity-bg)]/45 text-[var(--splity-muted)] transition hover:bg-white"
              onClick={() => exportParticipantPng(card, t)}
              type="button"
            >
              <span className="sr-only">{t("settlements.downloadParticipantPng")}</span>
              <Download className="h-4 w-4" />
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
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-2xl border border-[var(--splity-line)] bg-[var(--splity-bg)]/35 p-4">
            <div className={`mb-4 h-1.5 rounded-full ${roleStripe[card.role]}`} />
            <Badge tone={card.role === "receiver" ? "blue" : card.role === "payer" ? "red" : "neutral"}>
              {t(roleLabelKey(card.role))}
            </Badge>
            <div className="mt-3">
              <Badge tone={paymentStatusTone[card.paymentStatus]}>
                {t(paymentStatusLabelKey(card.paymentStatus))}
              </Badge>
            </div>
            <p className="splity-display mt-4 text-3xl font-extrabold text-[var(--splity-navy)]">
              {card.netAmount}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--splity-muted)]">
              {t("settlements.netAmount")}
            </p>

            <div className="mt-6 grid gap-3">
              <h3 className="text-sm font-extrabold text-[var(--splity-ink)]">
                {t("settlements.relatedTransfers")}
              </h3>
              {card.transfers.length ? (
                card.transfers.map((transfer) => (
                  <div
                    className="rounded-xl border border-[var(--splity-line)] bg-white p-3"
                    key={`${transfer.direction}-${transfer.otherName}-${transfer.amount}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-[var(--splity-ink)]">
                        {transfer.direction === "pay" ? (
                          <ArrowUpRight className="h-4 w-4 text-red-600" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4 text-cyan-600" />
                        )}
                        {transfer.direction === "pay"
                          ? t("settlements.payTo")
                          : t("settlements.receiveFrom")}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-[var(--splity-navy)]">
                        {transfer.amount}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[var(--splity-muted)]">
                      {transfer.otherName || t("groupDetail.unknown")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-[var(--splity-line-strong)] bg-white p-3 text-sm font-semibold text-[var(--splity-muted)]">
                  {t("settlements.noTransfers")}
                </p>
              )}
            </div>
          </aside>

          <div className="grid gap-3">
            <h3 className="text-sm font-extrabold text-[var(--splity-ink)]">
              {t("settlements.involvedBills")}
            </h3>
            {card.bills.length ? (
              card.bills.map((bill) => <ParticipantBillCard bill={bill} key={bill.id} />)
            ) : (
              <p className="rounded-2xl border border-dashed border-[var(--splity-line-strong)] p-5 text-sm font-semibold text-[var(--splity-muted)]">
                {t("settlements.noParticipantBills")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ParticipantBillCard({ bill }: { bill: ParticipantSettlementBill }) {
  const { t } = useTranslation();

  return (
    <article className="rounded-2xl border border-[var(--splity-line)] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-[var(--splity-gold-strong)]" />
            <h4 className="font-extrabold text-[var(--splity-ink)]">{bill.storeName}</h4>
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--splity-muted)]">
            {bill.date}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--splity-muted)]">
            {t("groupDetail.total")}
          </p>
          <p className="font-mono text-lg font-extrabold text-[var(--splity-navy)]">
            {bill.total}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Metric label={t("bills.primaryPayer")} value={bill.payer || t("groupDetail.unknown")} />
        <Metric label={t("settlements.participantShare")} value={bill.participantShare} />
        <Metric label={t("settlements.participantPaid")} value={bill.participantContribution} />
      </div>

      <div className="mt-4 grid gap-2">
        {bill.items.map((item) => (
          <div
            className={[
              "grid gap-2 rounded-xl border px-3 py-2 text-sm sm:grid-cols-[1fr_auto]",
              item.involved
                ? "border-cyan-200 bg-cyan-50"
                : "border-[var(--splity-line)] bg-[var(--splity-bg)]/30",
            ].join(" ")}
            key={`${bill.id}-${item.description}`}
          >
            <div>
              <p className="font-bold text-[var(--splity-ink)]">{item.description}</p>
              <p className="text-xs font-semibold text-[var(--splity-muted)]">
                {t("bills.responsibleParticipants")}:{" "}
                {item.participants.join(", ") || t("bills.none")}
              </p>
            </div>
            <p className="font-mono font-extrabold text-[var(--splity-navy)]">{item.amount}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--splity-bg)]/45 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--splity-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-extrabold text-[var(--splity-ink)]">{value}</p>
    </div>
  );
}

function roleLabelKey(role: ParticipantSettlementRole): MessageKey {
  if (role === "payer") return "settlements.role.payer";
  if (role === "receiver") return "settlements.role.receiver";
  return "settlements.role.balanced";
}

function paymentStatusLabelKey(status: ParticipantPaymentStatus): MessageKey {
  if (status === "pending") return "settlements.paymentStatus.pending";
  if (status === "markedPaid") return "settlements.paymentStatus.markedPaid";
  if (status === "received") return "settlements.paymentStatus.received";
  return "settlements.paymentStatus.balanced";
}

function exportParticipantPng(
  card: ParticipantSettlementCard,
  t: (key: MessageKey) => string
) {
  const width = 1080;
  const billHeight = 150;
  const transferHeight = Math.max(1, card.transfers.length) * 42;
  const height = 260 + transferHeight + Math.max(1, card.bills.length) * billHeight;
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

  ctx.fillStyle = card.role === "payer" ? "#ef4444" : card.role === "receiver" ? "#06b6d4" : "#9499aa";
  roundRect(ctx, 72, 72, 120, 34, 17);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 13px Arial";
  ctx.fillText(t(roleLabelKey(card.role)).toUpperCase(), 92, 94);

  ctx.fillStyle = "#0c1538";
  ctx.font = "800 34px Arial";
  ctx.fillText(card.name, 72, 150);
  ctx.font = "800 28px Arial";
  ctx.fillText(card.netAmount, 72, 190);
  ctx.fillStyle = "#5f6681";
  ctx.font = "700 13px Arial";
  ctx.fillText(t("settlements.netAmount").toUpperCase(), 72, 216);

  let cursorY = 270;
  ctx.fillStyle = "#d8941a";
  ctx.font = "800 13px Arial";
  ctx.fillText(t("settlements.relatedTransfers").toUpperCase(), 72, cursorY);
  cursorY += 34;

  const transfers = card.transfers.length
    ? card.transfers
    : [{ amount: "", direction: "pay" as const, otherName: t("settlements.noTransfers"), status: 0 }];
  transfers.forEach((transfer) => {
    ctx.fillStyle = "#fbfaf5";
    roundRect(ctx, 72, cursorY - 24, width - 144, 34, 10);
    ctx.fill();
    ctx.fillStyle = "#0c1538";
    ctx.font = "700 14px Arial";
    ctx.fillText(
      transfer.direction === "pay" ? t("settlements.payTo") : t("settlements.receiveFrom"),
      92,
      cursorY
    );
    ctx.fillText(transfer.otherName, 250, cursorY);
    ctx.font = "800 14px Arial";
    ctx.fillText(transfer.amount, width - 220, cursorY);
    cursorY += 42;
  });

  cursorY += 18;
  ctx.fillStyle = "#d8941a";
  ctx.font = "800 13px Arial";
  ctx.fillText(t("settlements.involvedBills").toUpperCase(), 72, cursorY);
  cursorY += 36;

  const bills = card.bills.length
    ? card.bills
    : [{
        date: "",
        id: "empty",
        items: [],
        payer: "",
        participantContribution: "",
        participantShare: "",
        storeName: t("settlements.noParticipantBills"),
        total: "",
      }];

  bills.forEach((bill) => {
    ctx.fillStyle = "#fbfaf5";
    roundRect(ctx, 72, cursorY - 26, width - 144, 118, 14);
    ctx.fill();
    ctx.fillStyle = "#0c1538";
    ctx.font = "800 20px Arial";
    ctx.fillText(trimText(ctx, bill.storeName, 420), 96, cursorY + 2);
    ctx.fillStyle = "#5f6681";
    ctx.font = "700 12px Arial";
    ctx.fillText(bill.date, 96, cursorY + 28);
    ctx.fillText(`${t("settlements.participantShare")}: ${bill.participantShare}`, 96, cursorY + 58);
    ctx.fillText(`${t("settlements.participantPaid")}: ${bill.participantContribution}`, 330, cursorY + 58);
    ctx.fillStyle = "#0c1538";
    ctx.font = "800 16px Arial";
    ctx.fillText(bill.total, width - 220, cursorY + 2);
    cursorY += billHeight;
  });

  const link = document.createElement("a");
  link.download = `${card.name}-settlement.png`;
  link.href = canvas.toDataURL("image/png");
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
