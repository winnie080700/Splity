"use client";

import { T } from "@/components/i18n/t";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";

type ConfirmDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
  cancelLabel?: React.ReactNode;
  children: React.ReactNode;
  confirmLabel: React.ReactNode;
  title: React.ReactNode;
  triggerLabel: React.ReactNode;
};

export function ConfirmDialog({
  action,
  cancelLabel = <T k="common.cancel" />,
  children,
  confirmLabel,
  title,
  triggerLabel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <details className="group relative">
      <summary className="inline-flex h-11 cursor-pointer list-none items-center justify-center rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">
        {triggerLabel}
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-zinc-200 bg-white p-4 shadow-lg">
        <form action={action} className="grid gap-3" onSubmit={() => toast.loading(t("common.saving"))}>
          <div>
            <h3 className="font-semibold text-zinc-950">{title}</h3>
            <div className="mt-2 text-sm leading-6 text-zinc-600">{children}</div>
          </div>
          <div className="flex justify-end gap-2">
            <span className="inline-flex h-10 items-center rounded-md px-3 text-sm font-semibold text-zinc-600">
              {cancelLabel}
            </span>
            <button
              className="inline-flex h-10 items-center justify-center rounded-md bg-red-700 px-3 text-sm font-semibold text-white transition hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
              type="submit"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </details>
  );
}
