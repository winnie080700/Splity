"use client";

import { CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { GROUP_STATUS } from "@/lib/domain/status";
import { useTranslation } from "@/lib/i18n";
import {
  changeStatusAction,
  deleteGroupAction,
  renameGroupAction,
  type GroupActionState,
} from "./actions";

const initialState: GroupActionState = { error: null, success: null };

function SubmitButton({
  children,
  danger,
  pendingLabel,
}: {
  children: ReactNode;
  danger?: boolean;
  pendingLabel: string;
}) {
  return (
    <PendingActionButton
      className={
        danger
          ? "bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700"
          : undefined
      }
      pendingLabel={pendingLabel}
      type="submit"
    >
      {children}
    </PendingActionButton>
  );
}

export function GroupHeaderActions({
  groupId,
  name,
  status,
}: {
  groupId: string;
  name: string;
  status: number;
}) {
  const [openModal, setOpenModal] = useState<
    "edit" | "settling" | "settled" | "delete" | null
  >(null);
  const [renameState, renameAction] = useActionState(
    renameGroupAction.bind(null, groupId),
    initialState
  );
  const [statusState, statusAction] = useActionState(
    changeStatusAction.bind(null, groupId),
    initialState
  );
  const { t } = useTranslation();
  const statusToastId = useRef<string | number | null>(null);
  const isUnresolved = status === GROUP_STATUS.unresolved;
  const isSettling = status === GROUP_STATUS.settling;

  function startStatusToast() {
    if (statusToastId.current !== null) toast.dismiss(statusToastId.current);
    statusToastId.current = toast.loading(t("settings.updating"));
  }

  function dismissStatusToast() {
    if (statusToastId.current === null) return;
    toast.dismiss(statusToastId.current);
    statusToastId.current = null;
  }

  useEffect(() => {
    if (renameState.success) {
      toast.success(renameState.success);
      setOpenModal(null);
    }
    if (renameState.error) toast.error(renameState.error);
  }, [renameState.error, renameState.success]);

  useEffect(() => {
    if (statusState.success) {
      dismissStatusToast();
      toast.success(statusState.success);
      setOpenModal(null);
    }
    if (statusState.error) {
      dismissStatusToast();
      toast.error(statusState.error);
    }
  }, [statusState.error, statusState.success]);

  return (
    <>
      <div className="grid w-full gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end">
        {isUnresolved ? (
          <>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--splity-line)] bg-white px-4 text-sm font-bold text-[var(--splity-ink)] transition hover:bg-[var(--splity-bg)]"
              onClick={() => setOpenModal("edit")}
              type="button"
            >
              <Pencil className="h-4 w-4" />
              {t("common.rename")}
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--splity-navy)] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#15225a]"
              onClick={() => setOpenModal("settling")}
              type="button"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t("groupDetail.markAsSettling")}
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition hover:bg-red-50"
              onClick={() => setOpenModal("delete")}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              {t("common.delete")}
            </button>
          </>
        ) : null}
        {isSettling ? (
          <>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--splity-mint)] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#26764f]"
              onClick={() => setOpenModal("settled")}
              type="button"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t("groupDetail.markAsSettled")}
            </button>
          </>
        ) : null}
      </div>

      {openModal === "edit" ? (
        <Dialog onOpenChange={(open) => !open && setOpenModal(null)} open>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("groupDetail.editGroup")}</DialogTitle>
            </DialogHeader>
          <form action={renameAction} className="grid gap-4">
            <Input defaultValue={name} label={t("groups.name")} name="name" required />
            <DialogFooter>
              <Button onClick={() => setOpenModal(null)} type="button" variant="secondary">
                {t("common.cancel")}
              </Button>
              <SubmitButton pendingLabel={t("common.saving")}>{t("common.save")}</SubmitButton>
            </DialogFooter>
          </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {openModal === "settling" ? (
        <AlertDialog onOpenChange={(open) => !open && setOpenModal(null)} open>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("groupDetail.markAsSettling")}</AlertDialogTitle>
              <AlertDialogDescription>{t("groupDetail.statusProgressConfirm")}</AlertDialogDescription>
            </AlertDialogHeader>
          <form action={statusAction} className="grid gap-4" onSubmit={startStatusToast}>
            <input name="status" type="hidden" value={GROUP_STATUS.settling} />
            <AlertDialogFooter>
              <Button onClick={() => setOpenModal(null)} type="button" variant="secondary">
                {t("common.cancel")}
              </Button>
              <SubmitButton pendingLabel={t("settings.updating")}>
                {t("groupDetail.markAsSettling")}
              </SubmitButton>
            </AlertDialogFooter>
          </form>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {openModal === "settled" ? (
        <AlertDialog onOpenChange={(open) => !open && setOpenModal(null)} open>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("groupDetail.markAsSettled")}</AlertDialogTitle>
              <AlertDialogDescription>{t("groupDetail.statusProgressConfirm")}</AlertDialogDescription>
            </AlertDialogHeader>
          <form action={statusAction} className="grid gap-4" onSubmit={startStatusToast}>
            <input name="status" type="hidden" value={GROUP_STATUS.settled} />
            <AlertDialogFooter>
              <Button onClick={() => setOpenModal(null)} type="button" variant="secondary">
                {t("common.cancel")}
              </Button>
              <SubmitButton pendingLabel={t("settings.updating")}>
                {t("groupDetail.markAsSettled")}
              </SubmitButton>
            </AlertDialogFooter>
          </form>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {openModal === "delete" ? (
        <AlertDialog onOpenChange={(open) => !open && setOpenModal(null)} open>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("groups.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("groupDetail.deleteGroupBody")}</AlertDialogDescription>
            </AlertDialogHeader>
          <form action={deleteGroupAction} className="grid gap-4">
            <input name="groupId" type="hidden" value={groupId} />
            <AlertDialogFooter>
              <Button onClick={() => setOpenModal(null)} type="button" variant="secondary">
                {t("common.cancel")}
              </Button>
              <SubmitButton danger pendingLabel={t("common.sending")}>
                {t("groups.deleteGroup")}
              </SubmitButton>
            </AlertDialogFooter>
          </form>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}
