import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
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
import { getBill, listBills } from "@/lib/services/bills";
import {
  listParticipants,
  type Participant,
} from "@/lib/services/participants";
import { getActiveShare } from "@/lib/services/settlement-shares";
import { listGroupUserPaymentProfiles } from "@/lib/services/users";
import { createBillAction, deleteBillAction, updateBillAction } from "./bills/actions";
import { BillDeleteForm } from "./bills/bill-delete-form";
import { BillPreview } from "./bills/bill-preview";
import { BillForm } from "./bills/bill-form";
import { BillExportButton } from "./bill-export-button";
import { GroupHeaderActions } from "./group-header-actions";
import { ParticipantsForm } from "./participants-form";
import {
  ShareSettlementModal,
  type SettlementReceiverInfo,
} from "./share-settlement-modal";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionTitle } from "@/components/ui/section-title";
import { BillModalFrame } from "@/components/ui/bill-modal-frame";
import { BillModalSkeleton } from "@/components/ui/bill-modal-skeleton";
import { BillsTable } from "@/components/ui/bill-table";
import { LoadingLink } from "@/components/ui/route-toast";
import { TransfersList } from "@/components/ui/transfer-list";
import { groupTotal, groupFees, pendingTransferCount, formatDate, money, formatTableDate } from "@/lib/services/utils";
import { GroupPageProps, statusMeta } from "./type";
import { getSettlement, type SettlementResultDto } from "@/lib/services/settlements";

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
    listBills(groupId),
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
  const receiverInfos = await buildSettlementReceiverInfos(groupId, participants, settlement);

  return (
    <div className="mx-auto grid w-full max-w-[1640px] gap-7">
      <nav className="flex items-center gap-2 text-sm font-semibold text-[var(--splity-muted)]">
        <LoadingLink
          className="inline-flex items-center gap-2 transition hover:text-[var(--splity-ink)]"
          href="/groups"
          loadingKey="groups.returning"
        >
          <ArrowLeft className="h-4 w-4" />
          <T k="dashboard.groupsTitle" />
        </LoadingLink>
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
                payer:
                  participantById.get(bill.primaryPayerParticipantId)?.name ??
                  "",
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

        <TransfersList
          participantById={participantById}
          settlement={settlement}
        />
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

async function buildSettlementReceiverInfos(
  groupId: string,
  participants: Participant[],
  settlement: SettlementResultDto | null
): Promise<SettlementReceiverInfo[]> {
  if (!settlement) return [];

  const participantById = new Map(
    participants.map((participant) => [participant.id, participant])
  );
  const receiverIds = Array.from(
    new Set(settlement.transfers.map((transfer) => transfer.toParticipantId))
  );
  const invitedUserIds = receiverIds
    .map((participantId) => participantById.get(participantId)?.invited_user_id)
    .filter((id): id is string => Boolean(id));
  const profiles = await listGroupUserPaymentProfiles(groupId, invitedUserIds);

  return receiverIds.map((participantId) => {
    const participant = participantById.get(participantId);
    const profile = participant?.invited_user_id
      ? profiles.get(participant.invited_user_id)
      : null;
    const incomingTransfers = settlement.transfers.filter(
      (transfer) => transfer.toParticipantId === participantId
    );

    return {
      accountName: profile?.accountName ?? "",
      accountNumber: profile?.accountNumber ?? "",
      incomingCount: incomingTransfers.length,
      locked: Boolean(participant?.invited_user_id),
      notes: profile?.notes ?? "",
      paidCount: incomingTransfers.filter((transfer) => transfer.status === 2).length,
      participantId,
      paymentMethod: profile?.paymentMethod ?? "",
      paymentQrDataUrl: profile?.paymentQrDataUrl ?? "",
      receiverName: profile?.payeeName ?? participant?.name ?? "",
    };
  });
}

function BillModal({
  billId,
  canEdit,
  closeHref,
  groupId,
  mode,
  participants,
}: {
  billId: string | null;
  canEdit: boolean;
  closeHref: string;
  groupId: string;
  mode: "new" | "view" | "edit" | "delete" | null;
  participants: Participant[];
}) {
  if (!mode) return null;
  if ((mode === "view" || mode === "edit" || mode === "delete") && !billId) {
    return null;
  }

  if (mode === "new") {
    return (
      <BillModalFrame
        closeHref={closeHref}
        kicker={<T k="bills.input" />}
        title={<T k="groups.newBill" />}
      >
        <BillForm
          action={createBillAction.bind(null, groupId)}
          canEdit={canEdit}
          groupId={groupId}
          participants={participants}
        />
      </BillModalFrame>
    );
  }

  if (mode === "edit" && billId) {
    return (
      <BillModalFrame
        closeHref={closeHref}
        kicker={<T k="bills.input" />}
        title={<T k="bills.editBill" />}
      >
        <Suspense fallback={<BillModalSkeleton />}>
          <BillModalBillContent
            billId={billId}
            canEdit={canEdit}
            closeHref={closeHref}
            groupId={groupId}
            mode={mode}
            participants={participants}
          />
        </Suspense>
      </BillModalFrame>
    );
  }

  if (mode === "delete" && billId) {
    return (
      <BillModalFrame
        closeHref={closeHref}
        kicker={<T k="groupDetail.actions" />}
        title={<T k="bills.deleteTitle" />}
      >
        <Suspense fallback={<BillModalSkeleton compact />}>
          <BillModalBillContent
            billId={billId}
            canEdit={canEdit}
            closeHref={closeHref}
            groupId={groupId}
            mode={mode}
            participants={participants}
          />
        </Suspense>
      </BillModalFrame>
    );
  }

  return billId ? (
      <BillModalFrame
        closeHref={closeHref}
        kicker={<T k="bills.billDetails" />}
        title={<T k="bills.billDetails" />}
        width="narrow"
      >
        <Suspense fallback={<BillModalSkeleton />}>
        <BillModalBillContent
          billId={billId}
          canEdit={canEdit}
          closeHref={closeHref}
          groupId={groupId}
          mode="view"
          participants={participants}
        />
      </Suspense>
    </BillModalFrame>
  ) : null;
}

async function BillModalBillContent({
  billId,
  canEdit,
  closeHref,
  groupId,
  mode,
  participants,
}: {
  billId: string;
  canEdit: boolean;
  closeHref: string;
  groupId: string;
  mode: "view" | "edit" | "delete";
  participants: Participant[];
}) {
  const bill = await getBill(groupId, billId);

  if (!bill) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--splity-line-strong)] p-8 text-center text-sm font-semibold text-[var(--splity-muted)]">
        <T k="bills.unknown" />
      </div>
    );
  }

  if (mode === "edit") {
    return (
      <BillForm
        action={updateBillAction.bind(null, groupId, bill.id)}
        canEdit={canEdit}
        groupId={groupId}
        initialBill={bill}
        participants={participants}
      />
    );
  }

  if (mode === "delete") {
    return (
      <BillDeleteForm
        action={deleteBillAction}
        billId={bill.id}
        closeHref={closeHref}
        groupId={groupId}
      />
    );
  }

  return <BillPreview bill={bill} hideHeader participants={participants} />;
}


