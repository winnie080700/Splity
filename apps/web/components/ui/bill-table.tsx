"use client";

import { BillSummary } from "@/lib/calculations/bill-read-projection";
import { SPLIT_MODE } from "@/lib/calculations/types";
import { Participant } from "@/lib/services/participants";
import { Eye, Edit3, Trash2 } from "lucide-react";
import { T } from "../i18n/t";
import { IconAction } from "./icon-action";
import { formatTableDate, splitModeLabel, initials, money } from "@/lib/services/utils";
import { useTranslation } from "@/lib/i18n";

export function BillsTable({
  bills,
  canEdit,
  groupId,
  onDelete,
  participantById,
}: {
  bills: BillSummary[];
  canEdit: boolean;
  groupId: string;
  onDelete?: (bill: BillSummary) => void;
  participantById: Map<string, Participant>;
}) {
  if (!bills.length) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-[var(--splity-line-strong)] p-8 text-center text-sm font-medium text-[var(--splity-muted)]">
        <T k="groups.firstBillHint" />
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 grid gap-2 md:hidden">
        {bills.map((bill) => (
          <MobileBillCard
            bill={bill}
            canEdit={canEdit}
            groupId={groupId}
            key={bill.id}
            onDelete={onDelete}
            participantById={participantById}
          />
        ))}
      </div>

      <div className="mt-8 hidden overflow-x-auto rounded-t-2xl border border-[var(--splity-line)] md:block">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead className="bg-teal-50 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-800">
            <tr>
              <th className="px-4 py-3">
                <T k="groupDetail.date" />
              </th>
              <th className="px-4 py-3">
                <T k="groupDetail.store" />
              </th>
              <th className="px-4 py-3">
                <T k="groupDetail.splitMode" />
              </th>
              <th className="px-4 py-3">
                <T k="groupDetail.primaryPayer" />
              </th>
              <th className="px-4 py-3">
                <T k="bills.subtotal" />
              </th>
              <th className="px-4 py-3">
                <T k="bills.fees" />
              </th>
              <th className="px-4 py-3">
                <T k="groupDetail.total" />
              </th>
              <th className="px-4 py-3 text-right">
                <T k="groupDetail.actions" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--splity-line)] bg-white">
            {bills.map((bill) => {
              const payer = participantById.get(bill.primaryPayerParticipantId);

              return (
                <tr
                  className="transition hover:bg-[var(--splity-bg)]/35"
                  key={bill.id}>
                  <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-bold text-[var(--splity-navy)]">
                    {formatTableDate(bill.transactionDateUtc)}
                  </td>
                  <td className="px-4 py-4 font-bold">
                    <span>{bill.storeName}</span>
                  </td>
                  <td className="px-4 py-4">
                    <SplitModePill splitMode={bill.splitMode} />
                  </td>
                  <td className="px-4 py-4">
                    <PayerCell payer={payer} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-mono font-bold text-[var(--splity-ink)]">
                    {money(bill.subtotalAmount, bill.currencyCode)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-mono text-[var(--splity-muted)]">
                    {money(bill.totalFeeAmount, bill.currencyCode)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-mono font-bold text-[var(--splity-ink)]">
                    {money(bill.grandTotalAmount, bill.currencyCode)}
                  </td>
                  <td className="px-4 py-4">
                    <BillActions bill={bill} canEdit={canEdit} groupId={groupId} onDelete={onDelete} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MobileBillCard({
  bill,
  canEdit,
  groupId,
  onDelete,
  participantById,
}: {
  bill: BillSummary;
  canEdit: boolean;
  groupId: string;
  onDelete?: (bill: BillSummary) => void;
  participantById: Map<string, Participant>;
}) {
  const payer = participantById.get(bill.primaryPayerParticipantId);

  return (
    <article className="rounded-xl border border-[var(--splity-line)] bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--splity-ink)]">{bill.storeName}</p>
          <p className="mt-0.5 font-mono text-[11px] font-bold text-[var(--splity-muted)]">
            {formatTableDate(bill.transactionDateUtc)}
          </p>
        </div>
        <p className="shrink-0 font-mono text-sm font-extrabold text-[var(--splity-navy)]">
          {money(bill.grandTotalAmount, bill.currencyCode)}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--splity-line)] pt-2">
        <SplitModePill splitMode={bill.splitMode} />
        <div className="min-w-0 flex-1">
          <PayerCell payer={payer} />
        </div>
        <span className="text-[11px] font-semibold text-[var(--splity-muted)]">
          <T k="bills.fees" /> {money(bill.totalFeeAmount, bill.currencyCode)}
        </span>
      </div>

      <div className="mt-2 flex justify-end gap-1">
        <BillActions bill={bill} canEdit={canEdit} groupId={groupId} onDelete={onDelete} />
      </div>
    </article>
  );
}

function SplitModePill({ splitMode }: { splitMode: BillSummary["splitMode"] }) {
  const splitIsUneven = splitMode === SPLIT_MODE.weighted;

  return (
    <span
      className={[
        "inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[11px] font-bold",
        splitIsUneven
          ? "bg-purple-100 text-purple-700"
          : "border border-teal-200 bg-teal-50 text-teal-700",
      ].join(" ")}>
      <T k={splitModeLabel(splitMode)} />
    </span>
  );
}

function PayerCell({ payer }: { payer?: Participant }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-700 text-[9px] font-bold text-white">
        {payer ? initials(payer.name) : "?"}
      </span>
      <span className="min-w-0 truncate text-xs font-medium text-[var(--splity-ink)]">
        {payer?.name ?? <T k="groupDetail.unknown" />}
      </span>
    </div>
  );
}

function BillActions({
  bill,
  canEdit,
  groupId,
  onDelete,
}: {
  bill: BillSummary;
  canEdit: boolean;
  groupId: string;
  onDelete?: (bill: BillSummary) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-end gap-1">
      <IconAction
        href={`/groups/${groupId}?billMode=view&billId=${bill.id}`}
        icon={<Eye className="h-4 w-4" />}
        label={<T k="groupDetail.viewBill" />}
      />
      {canEdit ? (
        <>
          <IconAction
            href={`/groups/${groupId}?billMode=edit&billId=${bill.id}`}
            icon={<Edit3 className="h-4 w-4" />}
            label={<T k="bills.editBill" />}
          />
          {onDelete ? (
            <button
              aria-label={t("bills.deleteBill")}
              className="grid h-9 w-9 place-items-center rounded-full border border-[var(--splity-line)] text-[var(--splity-muted)] transition hover:bg-red-50 hover:text-red-700"
              onClick={() => onDelete(bill)}
              type="button"
            >
              <span className="sr-only"><T k="bills.deleteBill" /></span>
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <IconAction
              href={`/groups/${groupId}?billMode=delete&billId=${bill.id}`}
              icon={<Trash2 className="h-4 w-4" />}
              label={<T k="bills.deleteBill" />}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
