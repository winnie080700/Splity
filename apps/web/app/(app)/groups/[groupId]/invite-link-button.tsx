"use client";

import { Copy, Link2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";
import { createInviteLinkAction, type InviteLinkActionState } from "./actions";

const initialState: InviteLinkActionState = { error: null, url: null };

export function InviteLinkButton({ groupId }: { groupId: string }) {
  const [state, action, pending] = useActionState(
    createInviteLinkAction.bind(null, groupId),
    initialState,
  );
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.url) setOpen(true);
  }, [state]);

  async function copyLink() {
    if (!state.url) return;
    try {
      await navigator.clipboard.writeText(state.url);
      toast.success(t("groupDetail.inviteLinkCopied"));
    } catch {
      inputRef.current?.select();
      toast.error(t("share.copyFailed"));
    }
  }

  return (
    <>
      <form action={action}>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--splity-line-strong)] bg-white px-4 text-sm font-bold text-[var(--splity-ink)] transition hover:bg-teal-50 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          <Link2 className="h-4 w-4" />
          {t("groupDetail.shareInviteLink")}
        </button>
      </form>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("groupDetail.shareInviteLink")}</DialogTitle>
            <DialogDescription>{t("groupDetail.inviteLinkBody")}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex gap-2">
            <input
              aria-label={t("groupDetail.shareInviteLink")}
              className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--splity-line)] bg-[var(--splity-bg)] px-3 text-sm font-semibold text-[var(--splity-ink)] outline-none focus:border-teal-600"
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              ref={inputRef}
              value={state.url ?? ""}
            />
            <Button onClick={copyLink} type="button">
              <Copy className="h-4 w-4" />
              {t("groupDetail.copyInviteLink")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
