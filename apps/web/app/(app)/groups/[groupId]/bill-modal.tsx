import { Suspense } from "react";

import { T } from "@/components/i18n/t";
import { BillAlertDialogFrame, BillModalFrame } from "@/components/ui/bill-modal-frame";
import { BillModalSkeleton } from "@/components/ui/bill-modal-skeleton";
import type { Participant } from "@/lib/services/participants";
import { getBill } from "@/lib/services/bills";
import { createBillAction, deleteBillAction, updateBillAction } from "./bills/actions";
import { BillDeleteForm } from "./bills/bill-delete-form";
import { BillForm } from "./bills/bill-form";
import { BillPreview } from "./bills/bill-preview";

type BillMode = "new" | "view" | "edit" | "delete" | null;

type BillModalProps = {
  billId: string | null;
  canEdit: boolean;
  closeHref: string;
  groupId: string;
  mode: BillMode;
  participants: Participant[];
};

type BillModalBillContentProps = {
  billId: string;
  canEdit: boolean;
  closeHref: string;
  groupId: string;
  mode: Exclude<BillMode, "new" | null>;
  participants: Participant[];
};

export function BillModal({
  billId,
  canEdit,
  closeHref,
  groupId,
  mode,
  participants,
}: BillModalProps) {
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
      <BillAlertDialogFrame
        closeHref={closeHref}
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
      </BillAlertDialogFrame>
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
}: BillModalBillContentProps) {
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
