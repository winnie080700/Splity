"use client";

import { Check, CreditCard, Eye, Pencil, QrCode, Upload } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "@/lib/i18n";
import { updatePaymentProfileAction, type SettingsActionState } from "./actions";

type PaymentProfileFormProps = {
  accountName: string;
  accountNumber: string;
  notes: string;
  payeeName: string;
  paymentMethod: string;
  paymentQrDataUrl: string;
};

const initialState: SettingsActionState = { error: null, success: null };
const MAX_QR_BYTES = 5 * 1024 * 1024;
const SUPPORTED_QR_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

function PaymentSaveButton({
  editing,
  formRef,
  hasUnsavedQr,
  onCancel,
  setEditing,
}: {
  editing: boolean;
  formRef: RefObject<HTMLFormElement | null>;
  hasUnsavedQr: boolean;
  onCancel: () => void;
  setEditing: (value: boolean) => void;
}) {
  const { pending } = useFormStatus();
  const { t } = useTranslation();
  const saving = editing || hasUnsavedQr;

  if (!saving) {
    return (
      <button
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--splity-line)] bg-white px-4 text-sm font-bold text-[#087f6f] transition hover:border-[#087f6f] hover:bg-emerald-50"
        onClick={() => setEditing(true)}
        type="button"
      >
        <Pencil className="h-4 w-4" />
        {t("common.edit")}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 sm:justify-end">
      <button
        className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-bold text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)] disabled:opacity-60"
        disabled={pending}
        onClick={onCancel}
        type="button"
      >
        {t("common.cancel")}
      </button>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#087f6f] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(8,127,111,0.20)] transition hover:bg-[#066c60] disabled:opacity-60"
        disabled={pending}
        onClick={() => formRef.current?.requestSubmit()}
        type="button"
      >
        {pending ? <Spinner /> : <Check className="h-4 w-4" />}
        {pending ? t("common.saving") : t("common.save")}
      </button>
    </div>
  );
}

function PaymentCardHeader({
  action,
  body,
  title,
}: {
  action?: ReactNode;
  body: ReactNode;
  title: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div className="flex min-w-0 items-center gap-4">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#087f6f]">
          <CreditCard className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="splity-display text-xl font-extrabold tracking-tight text-[var(--splity-ink)]">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-5 text-[var(--splity-muted)]">{body}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

function PaymentRow({
  action,
  children,
  hint,
  label,
}: {
  action?: ReactNode;
  children: ReactNode;
  hint: ReactNode;
  label: ReactNode;
}) {
  return (
    <div className="grid min-h-[74px] gap-3 border-t border-[var(--splity-line)] px-5 py-4 sm:grid-cols-[minmax(180px,0.24fr)_1fr_auto] sm:items-center sm:px-7">
      <div>
        <p className="text-sm font-extrabold text-[var(--splity-ink)]">{label}</p>
        <p className="mt-1 text-xs text-[var(--splity-muted)]">{hint}</p>
      </div>
      <div>{children}</div>
      {action ? <div className="shrink-0 sm:justify-self-end">{action}</div> : null}
    </div>
  );
}

function textInputClass(editing: boolean) {
  return [
    "min-h-9 w-full rounded-lg text-sm font-extrabold text-[var(--splity-ink)] outline-none transition placeholder:text-[var(--splity-muted)] read-only:pointer-events-none read-only:cursor-default focus:border-[#087f6f] focus:bg-white focus:ring-2 focus:ring-[rgba(8,127,111,0.12)]",
    editing
      ? "border border-[#087f6f] bg-white px-3 ring-2 ring-[rgba(8,127,111,0.12)]"
      : "border border-transparent bg-transparent px-0",
  ].join(" ");
}

function textareaClass(editing: boolean) {
  return [
    "min-h-12 w-full rounded-lg px-4 py-3 text-sm font-semibold text-[var(--splity-ink)] outline-none transition placeholder:text-[var(--splity-muted)] read-only:pointer-events-none read-only:cursor-default read-only:resize-none focus:border-[#087f6f] focus:bg-white focus:ring-2 focus:ring-[rgba(8,127,111,0.12)]",
    editing
      ? "resize-y border border-[#087f6f] bg-white ring-2 ring-[rgba(8,127,111,0.12)]"
      : "resize-none border border-[var(--splity-line)] bg-white",
  ].join(" ");
}

export function PaymentProfileForm({
  accountName,
  accountNumber,
  notes,
  payeeName,
  paymentMethod,
  paymentQrDataUrl,
}: PaymentProfileFormProps) {
  const [state, formAction] = useActionState(updatePaymentProfileAction, initialState);
  const [editing, setEditing] = useState(false);
  const [hasUnsavedQr, setHasUnsavedQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(paymentQrDataUrl);
  const [qrError, setQrError] = useState<string | null>(null);
  const [isReadingQr, setIsReadingQr] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const qrInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      setEditing(false);
      setHasUnsavedQr(false);
    }
    if (state.error) toast.error(state.error);
  }, [state.error, state.success]);

  useEffect(() => {
    if (qrError) toast.error(qrError);
  }, [qrError]);

  async function handleQrChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setQrError(null);
      setIsReadingQr(true);

      if (!SUPPORTED_QR_TYPES.has(file.type)) {
        setQrError(t("settings.qrTypeError"));
        return;
      }

      if (file.size > MAX_QR_BYTES) {
        setQrError(t("settings.qrSizeError"));
        return;
      }

      setQrDataUrl(await readFileAsDataUrl(file));
      setHasUnsavedQr(true);
    } catch (error) {
      setQrError(error instanceof Error && error.message !== "read-failed" ? error.message : t("settings.qrReadError"));
    } finally {
      setIsReadingQr(false);
      event.target.value = "";
    }
  }

  function removeQr() {
    setQrDataUrl("");
    setHasUnsavedQr(true);
  }

  function cancelEdit() {
    formRef.current?.reset();
    setEditing(false);
    setHasUnsavedQr(false);
    setQrDataUrl(paymentQrDataUrl);
    setQrError(null);
  }

  return (
    <form action={formAction} className="grid gap-5" ref={formRef}>
      <section className="overflow-hidden rounded-2xl border border-[var(--splity-line)] bg-white shadow-[0_10px_30px_rgba(12,21,56,0.05)]">
        <PaymentCardHeader
          action={<PaymentSaveButton editing={editing} formRef={formRef} hasUnsavedQr={hasUnsavedQr} onCancel={cancelEdit} setEditing={setEditing} />}
          body={t("settings.paymentBodyNew")}
          title={t("settings.paymentPanelTitle")}
        />

        <PaymentRow
          hint={t("settings.receiverNameHint")}
          label={t("settings.receiverName")}
        >
          <input
            className={textInputClass(editing)}
            defaultValue={payeeName}
            maxLength={150}
            name="payeeName"
            placeholder={t("settings.receiverName")}
            readOnly={!editing}
          />
        </PaymentRow>

        <PaymentRow hint={t("settings.paymentMethodHint")} label={t("settings.paymentMethod")}>
          <textarea
            className={textareaClass(editing)}
            defaultValue={paymentMethod}
            maxLength={120}
            name="paymentMethod"
            placeholder={t("settings.paymentMethodPlaceholder")}
            readOnly={!editing}
          />
        </PaymentRow>

        <PaymentRow hint={t("settings.accountNameHint")} label={t("settings.accountName")}>
          <input
            className={textInputClass(editing)}
            defaultValue={accountName}
            maxLength={150}
            name="accountName"
            placeholder={t("settings.accountName")}
            readOnly={!editing}
          />
        </PaymentRow>

        <PaymentRow hint={t("settings.walletBankInfoHint")} label={t("settings.walletBankInfo")}>
          <input
            className={textInputClass(editing)}
            defaultValue={accountNumber}
            maxLength={120}
            name="accountNumber"
            placeholder={t("settings.walletBankInfoPlaceholder")}
            readOnly={!editing}
          />
        </PaymentRow>

        <PaymentRow hint={t("settings.notesHint")} label={t("settings.notes")}>
          <textarea
            className={textareaClass(editing)}
            defaultValue={notes}
            maxLength={2000}
            name="notes"
            placeholder={t("settings.notesPlaceholder")}
            readOnly={!editing}
          />
        </PaymentRow>
      </section>

      <input name="paymentQrDataUrl" type="hidden" value={qrDataUrl} />

      <section className="grid gap-4 rounded-2xl border border-[var(--splity-line)] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(12,21,56,0.05)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-7">
        {qrDataUrl ? (
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="group relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--splity-line)] bg-white p-1"
                type="button"
              >
                <img alt={t("settings.qrPreviewAlt")} className="h-full w-full object-contain" src={qrDataUrl} />
                <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                  <Eye className="h-5 w-5" />
                </span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{t("settings.paymentQr")}</DialogTitle>
                <DialogDescription>{t("settings.qrPreviewBody")}</DialogDescription>
              </DialogHeader>
              <div className="mt-5 rounded-2xl border border-[var(--splity-line)] bg-[var(--splity-bg)] p-4">
                <img alt={t("settings.qrPreviewAlt")} className="mx-auto max-h-[60dvh] w-full object-contain" src={qrDataUrl} />
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <span className="inline-flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-[var(--splity-line-strong)] bg-white text-[var(--splity-muted)]">
            <QrCode className="h-9 w-9" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold text-[var(--splity-ink)]">{t("settings.paymentQr")}</h3>
          <p className="mt-1 text-sm leading-5 text-[var(--splity-muted)]">{t("settings.paymentQrHint")}</p>
          <p className="mt-2 text-xs text-[var(--splity-muted)]">
            {hasUnsavedQr ? t("settings.qrSaveRequired") : qrDataUrl ? t("settings.qrAddedBody") : t("settings.qrEmptyBody")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <input
            ref={qrInputRef}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleQrChange}
            type="file"
          />
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--splity-line)] bg-white px-4 text-sm font-bold text-[var(--splity-ink)] transition hover:border-[var(--splity-line-strong)] hover:bg-[var(--splity-bg)] disabled:opacity-60"
            disabled={isReadingQr}
            onClick={() => qrInputRef.current?.click()}
            type="button"
          >
            {isReadingQr ? <Spinner /> : <Upload className="h-4 w-4" />}
            {isReadingQr ? t("settings.reading") : qrDataUrl ? t("settings.replaceQr") : t("settings.uploadQr")}
          </button>
          {qrDataUrl ? (
            <button
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-bold text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)]"
              onClick={removeQr}
              type="button"
            >
              {t("common.remove")}
            </button>
          ) : null}
        </div>
      </section>

      <div className="text-xs text-[var(--splity-muted)]">{t("settings.paymentPrivacy")}</div>
    </form>
  );
}
