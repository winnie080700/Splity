"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  return (
    <Button disabled={pending} type="submit">
      {pending ? "Saving..." : "Save payment profile"}
    </Button>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
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

  async function handleQrChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setQrError(null);
      setIsReadingQr(true);

      if (!SUPPORTED_QR_TYPES.has(file.type)) {
        setQrError("QR code must be a PNG, JPEG, or WebP image.");
        return;
      }

      if (file.size > MAX_QR_BYTES) {
        setQrError("QR code must be 5MB or smaller.");
        return;
      }

      const dataUrl = await readFileAsDataUrl(file);
      setQrDataUrl(dataUrl);
    } catch (error) {
      setQrError(error instanceof Error ? error.message : "Unable to read image.");
    } finally {
      setIsReadingQr(false);
      event.target.value = "";
    }
  }

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-zinc-950">Payment profile</h2>
        <p className="mt-1 text-sm text-zinc-500">
          These defaults prefill settlement share links.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input defaultValue={payeeName} label="Payee name" maxLength={150} name="payeeName" />
        <Input defaultValue={paymentMethod} label="Payment method" maxLength={120} name="paymentMethod" />
        <Input defaultValue={accountName} label="Account name" maxLength={150} name="accountName" />
        <Input defaultValue={accountNumber} label="Account number" maxLength={120} name="accountNumber" />
      </div>
      <label className="grid gap-2 text-sm font-medium text-zinc-800">
        <span>Notes</span>
        <textarea
          className="min-h-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
          defaultValue={notes}
          maxLength={2000}
          name="notes"
        />
      </label>
      <input name="paymentQrDataUrl" type="hidden" value={qrDataUrl} />
      <div className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-sm font-semibold text-zinc-800">QR code</p>
          <p className="mt-1 text-sm text-zinc-500">PNG, JPEG, or WebP up to 5MB.</p>
          {qrDataUrl ? (
            <img
              alt="Payment QR preview"
              className="mt-3 max-h-44 rounded-md border border-zinc-200 bg-white p-2"
              src={qrDataUrl}
            />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={qrInputRef}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleQrChange}
            type="file"
          />
          <Button disabled={isReadingQr} onClick={() => qrInputRef.current?.click()} type="button" variant="secondary">
            {isReadingQr ? "Reading..." : qrDataUrl ? "Replace" : "Upload"}
          </Button>
          {qrDataUrl ? (
            <Button onClick={() => setQrDataUrl("")} type="button" variant="ghost">
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <Alert tone="error">{qrError ?? state.error}</Alert>
      <Alert tone="success">{state.success}</Alert>
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
