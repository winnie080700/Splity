import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  ReceiptText,
  Share2,
  Users,
} from "lucide-react";

import { T } from "@/components/i18n/t";
import { GROUP_STATUS, getGroup, isGroupStatus } from "@/lib/services/groups";
import { listBillDetails } from "@/lib/services/bills";
import { listParticipants } from "@/lib/services/participants";
import { getActiveShare } from "@/lib/services/settlement-shares";
import { BillExportButton } from "./bill-export-button";
import { BillModal } from "./bill-modal";
import { GroupHeaderActions } from "./group-header-actions";
import { ParticipantsForm } from "./participants-form";
import { ShareSettlementModal } from "./share-settlement-modal";
import { SettlementParticipantCards } from "./settlement-participant-cards";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionTitle } from "@/components/ui/section-title";
import { BillsTable } from "@/components/ui/bill-table";
import { groupTotal, groupFees, pendingTransferCount, formatDate, money, formatTableDate, splitModeLabel } from "@/lib/services/utils";
import { GroupPageProps, statusMeta } from "./type";
import { getSettlement } from "@/lib/services/settlements";
import { buildSettlementReceiverInfos } from "./settlement-receiver-info";
import { buildParticipantSettlementCards } from "./settlement-participant-data";

export default async function GroupPage({ params, searchParams }: GroupPageProps) {
  const { groupId } = await params;
  const query = (await searchParams) ?? {};
  const billMode =
    query.billMode === "new" ||
    query.billMode === "view" ||
    query.billMode === "edit" ||
    query.billMode === "delete"
      ? query.billMode
      : null;
  const selectedBillId = query.billId ?? null;
  const shareSettlementOpen = query.shareSettlement === "1";
  const group = await getGroup(groupId);

  if (!group) notFound();

  const [participants, bills, settlement, activeShare] = await Promise.all([
    listParticipants(groupId),
    listBillDetails(groupId),
    getSettlement(groupId).catch(() => null),
    getActiveShare(groupId).catch(() => null),
  ]);
  const status = isGroupStatus(group.status)
    ? group.status
    : GROUP_STATUS.unresolved;
  const meta = statusMeta[status] ?? statusMeta[GROUP_STATUS.unresolved];
  const canEdit = status === GROUP_STATUS.unresolved;
  const participantById = new Map(
    participants.map((participant) => [participant.id, participant]),
  );
  const currencyCode = bills[0]?.currencyCode ?? "MYR";
  const total = groupTotal(bills);
  const fees = groupFees(bills);
  const transfersPending = pendingTransferCount(settlement);
  const groupHref = `/groups/${group.id}`;
  const receiverInfos = await buildSettlementReceiverInfos(participants, settlement);
  const settlementCards = buildParticipantSettlementCards({
    bills,
    participants,
    settlement,
  });

  return (
    <div className="mx-auto grid w-full max-w-[1640px] gap-7">
      <nav className="flex items-center gap-2 text-sm font-semibold text-[var(--splity-muted)]">
        <Link
          className="inline-flex items-center gap-2 transition hover:text-[var(--splity-ink)]"
          href="/groups">
          <ArrowLeft className="h-4 w-4" />
          <T k="dashboard.groupsTitle" />
        </Link>
        <span>/</span>
        <span className="text-[var(--splity-ink)]">{group.name}</span>
      </nav>

      <section className="rounded-3xl border border-[var(--splity-line)] bg-white p-5 shadow-[0_24px_60px_rgba(12,21,56,0.06)] sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle
            kicker={<T k="groupDetail.overview" />}
            title={group.name}
            badge={formatDate(group.created_at_utc)}
          />
          {status !== GROUP_STATUS.settled ? (
            <div className="flex justify-end">
              <GroupHeaderActions
                groupId={group.id}
                name={group.name}
                status={status}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Users className="h-4 w-4" />}
            label={<T k="groups.participants" />}
            value={participants.length}
          />
          <MetricCard
            icon={<ReceiptText className="h-4 w-4" />}
            label={<T k="groups.bills" />}
            value={bills.length}
          />
          <MetricCard
            accent
            icon={<ReceiptText className="h-4 w-4" />}
            label={<T k="groupDetail.groupTotal" />}
            value={money(total, currencyCode)}
          />
          <MetricCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label={<T k="groups.status" />}
            sub={
              <T
                k="groupDetail.pendingTransferCount"
                values={{ count: transfersPending }}
              />
            }
            value={
              <span className="uppercase">
                <T k={meta.labelKey} />
              </span>
            }
          />{" "}
        </div>
      </section>

      <ParticipantsForm
        canEdit={canEdit}
        creatorUserId={group.created_by_user_id}
        groupId={group.id}
        participants={participants}
      />

      <section className="rounded-3xl border border-[var(--splity-line)] bg-white p-5 shadow-[0_24px_60px_rgba(12,21,56,0.06)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle
            badge={
              <T k="groupDetail.billCount" values={{ count: bills.length }} />
            }
            kicker={<T k="groupDetail.billsKicker" />}
            title={<T k="groupDetail.everythingLogged" />}
          />
          <div className="flex flex-wrap gap-2">
            <BillExportButton
              bills={bills.map((bill) => ({
                date: formatTableDate(bill.transactionDateUtc),
                fees: money(bill.totalFeeAmount, bill.currencyCode),
                grandTotal: money(bill.grandTotalAmount, bill.currencyCode),
                items: bill.items.map((item) => ({
                  amount: money(item.amount, bill.currencyCode),
                  description: item.description,
                  participants: item.responsibleParticipantIds
                    .map((participantId) => participantById.get(participantId)?.name ?? "")
                    .filter(Boolean),
                })),
                payer:
                  participantById.get(bill.primaryPayerParticipantId)?.name ??
                  "",
                shares: bill.shares.map((share) => ({
                  fee: money(share.feeAmount, bill.currencyCode),
                  participant: participantById.get(share.participantId)?.name ?? "",
                  preFee: money(share.preFeeAmount, bill.currencyCode),
                  total: money(share.totalShareAmount, bill.currencyCode),
                })),
                splitModeKey: splitModeLabel(bill.splitMode),
                storeName: bill.storeName,
                subtotal: money(bill.subtotalAmount, bill.currencyCode),
              }))}
              filename={`${group.name}-bills`}
              totals={{
                fees: money(fees, currencyCode),
                grandTotal: money(total, currencyCode),
                subtotal: money(total - fees, currencyCode),
              }}
            />
            {canEdit ? (
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--splity-navy)] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#15225a]"
                href={`${groupHref}?billMode=new`}>
                <Plus className="h-4 w-4" />
                <T k="groups.newBill" />
              </Link>
            ) : null}
          </div>
        </div>

        <BillsTable
          bills={bills}
          canEdit={canEdit}
          groupId={group.id}
          participantById={participantById}
        />
        {bills.length ? (
          <div className="flex flex-wrap justify-end gap-8 rounded-b-2xl border-x border-b border-amber-200 bg-amber-50 px-4 py-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--splity-gold-strong)]">
            <span>
              <T k="bills.subtotal" />{" "}
              <strong className="ml-2 text-[var(--splity-ink)]">
                {money(total - fees, currencyCode)}
              </strong>
            </span>
            <span>
              <T k="bills.fees" />{" "}
              <strong className="ml-2 text-[var(--splity-ink)]">
                {money(fees, currencyCode)}
              </strong>
            </span>
            <span>
              <T k="groupDetail.groupTotal" />{" "}
              <strong className="ml-2 text-[var(--splity-ink)]">
                {money(total, currencyCode)}
              </strong>
            </span>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-[var(--splity-line)] bg-white p-5 shadow-[0_24px_60px_rgba(12,21,56,0.06)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle
            badge={
              <T
                k="groupDetail.transferCount"
                values={{ count: settlement?.transfers.length ?? 0 }}
              />
            }
            kicker={<T k="groupDetail.settlementPlan" />}
            title={<T k="groupDetail.smallestTransfers" />}
          />
          {status === GROUP_STATUS.settling ? (
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--splity-line)] bg-white px-3 text-sm font-bold text-[var(--splity-ink)] transition hover:bg-[var(--splity-bg)]"
              href={`${groupHref}?shareSettlement=1`}
            >
              <Share2 className="h-4 w-4" />
              <T k="groupDetail.shareSettlement" />
            </Link>
          ) : status === GROUP_STATUS.unresolved ? (
            <div className="grid justify-items-end gap-1">
              <span className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-xl border border-[var(--splity-line)] bg-[var(--splity-bg)]/55 px-3 text-sm font-bold text-[var(--splity-muted)]">
                <Share2 className="h-4 w-4" />
                <T k="groupDetail.shareSettlement" />
              </span>
              <p className="text-xs font-semibold text-[var(--splity-muted)]">
                <T k="groupDetail.shareAfterResolvedHint" />
              </p>
            </div>
          ) : null}
        </div>

        <SettlementParticipantCards cards={settlementCards} />
      </section>

      <BillModal
        billId={selectedBillId}
        canEdit={canEdit}
        closeHref={groupHref}
        groupId={group.id}
        mode={billMode}
        participants={participants}
      />
      <ShareSettlementModal
        activeShare={activeShare}
        closeHref={groupHref}
        groupId={group.id}
        open={shareSettlementOpen}
        receivers={receiverInfos}
      />
    </div>
  );
}





