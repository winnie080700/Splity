"use client";

import Link from "next/link";
import { T } from "@/components/i18n/t";
import { AlertDialogDescription } from "@/components/ui/alert-dialog";
import { PendingActionButton } from "@/components/ui/pending-action-button";

type BillDeleteFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  billId: string;
  closeHref: string;
  groupId: string;
};

export function BillDeleteForm({
  action,
  billId,
  closeHref,
  groupId,
}: BillDeleteFormProps) {
  return (
    <form
      action={action}
      className="grid gap-5"
    >
      <input name="groupId" type="hidden" value={groupId} />
      <input name="billId" type="hidden" value={billId} />
      <AlertDialogDescription>
        <T k="bills.deleteBody" />
      </AlertDialogDescription>
      <div className="flex justify-end gap-2">
        <Link
          className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-bold text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)]"
          href={closeHref}
        >
          <T k="common.cancel" />
        </Link>
        <PendingActionButton
          className="inline-flex h-11 items-center justify-center rounded-xl bg-red-700 px-4 text-sm font-bold text-white transition hover:bg-red-800"
          pendingToastKey="groups.deleting"
          type="submit"
        >
          <T k="bills.deleteBill" />
        </PendingActionButton>
      </div>
    </form>
  );
}
