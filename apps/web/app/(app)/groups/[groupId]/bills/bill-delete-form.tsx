"use client";

import Link from "next/link";
import { toast } from "sonner";

import { T } from "@/components/i18n/t";
import { useTranslation } from "@/lib/i18n";

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
  const { t } = useTranslation();

  return (
    <form
      action={action}
      className="grid gap-5"
      onSubmit={() => toast.loading(t("common.saving"))}
    >
      <input name="groupId" type="hidden" value={groupId} />
      <input name="billId" type="hidden" value={billId} />
      <p className="text-sm leading-6 text-[var(--splity-muted)]">
        <T k="bills.deleteBody" />
      </p>
      <div className="flex justify-end gap-2">
        <Link
          className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-bold text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)]"
          href={closeHref}
        >
          <T k="common.cancel" />
        </Link>
        <button
          className="inline-flex h-11 items-center justify-center rounded-xl bg-red-700 px-4 text-sm font-bold text-white transition hover:bg-red-800"
          type="submit"
        >
          <T k="bills.deleteBill" />
        </button>
      </div>
    </form>
  );
}
