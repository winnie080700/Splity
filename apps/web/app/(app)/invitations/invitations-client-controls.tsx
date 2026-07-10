"use client";

import { Check, X } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { T } from "@/components/i18n/t";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "@/lib/i18n";
import {
  acceptInvitationAction,
  declineInvitationAction,
  type InvitationActionState,
} from "./actions";

const initialState: InvitationActionState = { error: null, success: null };

function InvitationActionButton({
  children,
  compact = false,
  icon,
  variant = "primary",
}: {
  children: ReactNode;
  compact?: boolean;
  icon: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const toastId = useRef<string | number | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (pending && toastId.current === null) {
      toastId.current = toast.loading(t("common.saving"));
    }
    if (!pending && toastId.current !== null) {
      toast.dismiss(toastId.current);
      toastId.current = null;
    }
    return () => {
      if (toastId.current !== null) toast.dismiss(toastId.current);
    };
  }, [pending, t]);

  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        compact ? "h-7 whitespace-nowrap rounded-lg px-2.5 text-[11px]" : "h-11 w-full px-4",
        variant === "primary"
          ? compact
            ? "bg-[#087f6f] text-white shadow-[0_8px_18px_rgba(8,127,111,0.20)] hover:bg-[#066c60]"
            : "bg-[var(--splity-navy)] text-white shadow-[0_12px_26px_rgba(27,42,107,0.20)] hover:bg-[#25377f]"
          : "border border-[var(--splity-line)] bg-white text-[var(--splity-ink)] hover:border-[var(--splity-line-strong)] hover:bg-[var(--splity-bg)]",
      ].join(" ")}
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <><Spinner /><T k="common.saving" /></>
      ) : (
        <>
          {compact ? null : icon}
          {children}
        </>
      )}
    </button>
  );
}

export function InvitationActionForms({
  compact = false,
  participantId,
}: {
  compact?: boolean;
  participantId: string;
}) {
  const [acceptState, acceptAction] = useActionState(acceptInvitationAction, initialState);
  const [declineState, declineAction] = useActionState(declineInvitationAction, initialState);

  useEffect(() => {
    const success = acceptState.success ?? declineState.success;
    const error = acceptState.error ?? declineState.error;

    if (success) toast.success(success);
    if (error) toast.error(error);
  }, [acceptState.error, acceptState.success, declineState.error, declineState.success]);

  return (
    <div className={compact ? "flex shrink-0 justify-end gap-1.5" : "mt-4 grid gap-2 sm:grid-cols-2"}>
      <form action={acceptAction}>
        <input name="participantId" type="hidden" value={participantId} />
        <InvitationActionButton compact={compact} icon={<Check className="h-4 w-4" />}>
          <T k="invitations.accept" />
        </InvitationActionButton>
      </form>
      <form action={declineAction}>
        <input name="participantId" type="hidden" value={participantId} />
        <InvitationActionButton compact={compact} icon={<X className="h-4 w-4" />} variant="secondary">
          <T k="invitations.decline" />
        </InvitationActionButton>
      </form>
    </div>
  );
}
