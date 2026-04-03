import { type ReactNode } from "react";
import { ModalDialog } from "@/shared/ui/dialog";
import { InlineMessage, LoadingSpinner } from "@/shared/ui/primitives";

export function ConfirmDialog({
  open,
  title,
  description,
  details,
  confirmLabel,
  cancelLabel,
  error,
  isBusy,
  tone = "danger",
  onClose,
  onConfirm
}: {
  open: boolean;
  title: string;
  description: string;
  details?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  error?: string | null;
  isBusy?: boolean;
  tone?: "danger" | "default";
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalDialog
      open={open}
      title={title}
      description={description}
      onClose={() => {
        if (!isBusy) {
          onClose();
        }
      }}
      actions={(
        <>
          <button className="button-secondary w-full sm:w-auto" disabled={isBusy} onClick={onClose} type="button">
            {cancelLabel}
          </button>
          <button
            className={tone === "danger" ? "button-danger w-full sm:w-auto" : "button-primary w-full sm:w-auto"}
            disabled={isBusy}
            onClick={onConfirm}
            type="button"
          >
            {isBusy ? <LoadingSpinner /> : null}
            {confirmLabel}
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        {details ? (
          <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-4 py-4 text-sm leading-6 text-ink">
            {details}
          </div>
        ) : null}
        {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
      </div>
    </ModalDialog>
  );
}
