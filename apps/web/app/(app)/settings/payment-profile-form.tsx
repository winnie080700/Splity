"use client";

import { ArrowRight, Pencil, Plus, QrCode } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useTranslation();

  return (
    <Button
      className="gap-2 rounded-full bg-[var(--splity-navy)] px-6 shadow-[0_10px_24px_rgba(27,42,107,0.24)] hover:bg-[#142258]"
      disabled={pending}
      type="submit"
    >
      {pending ? t("common.saving") : t("common.saveChanges")}
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

function PaymentRow({
  action,
  children,
  hint,
  label,
}: {
  action?: ReactNode;
  children: ReactNode;
  hint: string;
  label: string;
}) {
  return (
    <div className="grid min-h-[70px] gap-3 rounded-xl border border-[var(--splity-line)] bg-[#fffefa] px-4 py-4 sm:grid-cols-[minmax(150px,0.12fr)_1fr_auto] sm:items-center">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--splity-gold-strong)]">
          {label}
        </p>
        <p className="mt-1 text-xs text-[var(--splity-muted)]">{hint}</p>
      </div>
      <div>{children}</div>
      {action ? <div className="justify-self-start sm:justify-self-end">{action}</div> : null}
    </div>
  );
}

function EditButton({ label }: { label: string }) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--splity-line)] bg-white text-[var(--splity-muted)] transition hover:border-[var(--splity-line-strong)] hover:text-[var(--splity-ink)]"
      type="button"
    >
      <Pencil className="h-4 w-4" />
    </button>
  );
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
  const [qrDataUrl, setQrDataUrl] = useState(paymentQrDataUrl);
  const [qrError, setQrError] = useState<string | null>(null);
  const [isReadingQr, setIsReadingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (state.success) toast.success(state.success);
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

      const dataUrl = await readFileAsDataUrl(file);
      setQrDataUrl(dataUrl);
    } catch (error) {
      setQrError(error instanceof Error && error.message !== "read-failed" ? error.message : t("settings.qrReadError"));
    } finally {
      setIsReadingQr(false);
      event.target.value = "";
    }
  }

  return (
    <form action={formAction} className="grid gap-3">
      <PaymentRow action={<EditButton label={t("settings.editReceiverName")} />} hint={t("settings.receiverNameHint")} label={t("settings.receiverName")}>
        <input
          className="min-h-9 w-full rounded-lg border border-transparent bg-transparent px-0 text-sm font-bold text-[var(--splity-ink)] outline-none transition placeholder:text-[var(--splity-muted)] focus:border-[var(--splity-line-strong)] focus:bg-white focus:px-3"
          defaultValue={payeeName}
          maxLength={150}
          name="payeeName"
          placeholder={t("settings.receiverName")}
        />
      </PaymentRow>

      <PaymentRow
        action={
          <button
            className="rounded-lg border border-[var(--splity-line)] bg-white px-4 py-2 text-xs font-bold text-[var(--splity-ink)] transition hover:bg-[#f7f5ee]"
            type="button"
          >
            {t("common.change")}
          </button>
        }
        hint={t("settings.paymentMethodHint")}
        label={t("settings.paymentMethod")}
      >
        <input
          className="min-h-9 w-full rounded-lg border border-transparent bg-transparent px-0 text-sm font-bold text-[var(--splity-ink)] outline-none transition placeholder:text-[var(--splity-muted)] focus:border-[var(--splity-line-strong)] focus:bg-white focus:px-3"
          defaultValue={paymentMethod}
          maxLength={120}
          name="paymentMethod"
          placeholder={t("settings.paymentMethodPlaceholder")}
        />
      </PaymentRow>

      <PaymentRow action={<EditButton label={t("settings.editAccountName")} />} hint={t("settings.accountNameHint")} label={t("settings.accountName")}>
        <input
          className="min-h-9 w-full rounded-lg border border-transparent bg-transparent px-0 text-sm font-bold text-[var(--splity-ink)] outline-none transition placeholder:text-[var(--splity-muted)] focus:border-[var(--splity-line-strong)] focus:bg-white focus:px-3"
          defaultValue={accountName}
          maxLength={150}
          name="accountName"
          placeholder={t("settings.accountName")}
        />
      </PaymentRow>

      <PaymentRow action={<EditButton label={t("settings.editWalletBankInfo")} />} hint={t("settings.walletBankInfoHint")} label={t("settings.walletBankInfo")}>
        <input
          className="min-h-9 w-full rounded-lg border border-transparent bg-transparent px-0 text-sm font-bold text-[var(--splity-ink)] outline-none transition placeholder:text-[var(--splity-muted)] focus:border-[var(--splity-line-strong)] focus:bg-white focus:px-3"
          defaultValue={accountNumber}
          maxLength={120}
          name="accountNumber"
          placeholder={t("settings.walletBankInfoPlaceholder")}
        />
      </PaymentRow>

      <PaymentRow hint={t("settings.notesHint")} label={t("settings.notes")}>
        <textarea
          className="min-h-20 w-full resize-y rounded-lg border border-[var(--splity-line)] bg-white px-4 py-3 text-sm text-[var(--splity-ink)] outline-none transition placeholder:text-[var(--splity-muted)] focus:border-[var(--splity-navy)] focus:ring-2 focus:ring-[rgba(27,42,107,0.12)]"
          defaultValue={notes}
          maxLength={2000}
          name="notes"
          placeholder={t("settings.notesPlaceholder")}
        />
      </PaymentRow>

      <input name="paymentQrDataUrl" type="hidden" value={qrDataUrl} />

      <PaymentRow
        action={
          <div className="flex flex-wrap gap-2">
            <input
              ref={qrInputRef}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleQrChange}
              type="file"
            />
            <Button
              className="gap-2 rounded-lg"
              disabled={isReadingQr}
              onClick={() => qrInputRef.current?.click()}
              type="button"
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
              {isReadingQr ? t("settings.reading") : qrDataUrl ? t("settings.replaceQr") : t("settings.uploadQr")}
            </Button>
            {qrDataUrl ? (
              <Button onClick={() => setQrDataUrl("")} type="button" variant="ghost">
                {t("common.remove")}
              </Button>
            ) : null}
          </div>
        }
        hint={t("settings.paymentQrHint")}
        label={t("settings.paymentQr")}
      >
        <div className="flex items-center gap-4">
          {qrDataUrl ? (
            <img
              alt={t("settings.qrPreviewAlt")}
              className="h-16 w-16 rounded-lg border border-[var(--splity-line)] bg-white object-contain p-1"
              src={qrDataUrl}
            />
          ) : (
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-[var(--splity-line-strong)] bg-white text-[var(--splity-muted)]">
              <QrCode className="h-6 w-6" />
            </span>
          )}
          <div>
            <p className="text-sm font-bold text-[var(--splity-ink)]">
              {qrDataUrl ? t("settings.qrAdded") : t("settings.qrEmpty")}
            </p>
            <p className="mt-1 text-xs text-[var(--splity-muted)]">
              {qrDataUrl ? t("settings.qrAddedBody") : t("settings.qrEmptyBody")}
            </p>
          </div>
        </div>
      </PaymentRow>

      <div className="mt-2 border-t border-dashed border-[var(--splity-line)] pt-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="text-xs text-[var(--splity-muted)]">{t("settings.paymentPrivacy")}</div>
          <SubmitButton />
        </div>
      </div>

      <Alert tone="error">{qrError ?? state.error}</Alert>
      <Alert tone="success">{state.success}</Alert>
    </form>
  );
}
