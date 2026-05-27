"use client";

import { CheckCircle2, Pencil, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GROUP_STATUS } from "@/lib/domain/status";
import { useTranslation } from "@/lib/i18n";
import {
  changeStatusAction,
  deleteGroupAction,
  renameGroupAction,
  type GroupActionState,
} from "./actions";

const initialState: GroupActionState = { error: null, success: null };

function Modal({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(12,21,56,0.28)] px-4 py-6">
      <div className="w-full max-w-lg rounded-3xl border border-[var(--splity-line)] bg-white p-5 shadow-[0_24px_80px_rgba(12,21,56,0.25)]">
        <div className="flex items-center justify-between gap-4">
          <h3 className="splity-display text-2xl font-bold text-[var(--splity-ink)]">
            {title}
          </h3>
          <button
            aria-label={t("common.close")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--splity-line)] text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function SubmitButton({
  children,
  danger,
  pendingLabel,
}: {
  children: ReactNode;
  danger?: boolean;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      className={
        danger
          ? "bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700"
          : undefined
      }
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </Button>
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
  const isUnresolved = status === GROUP_STATUS.unresolved;
  const isSettling = status === GROUP_STATUS.settling;

  useEffect(() => {
    if (renameState.success) {
      toast.success(renameState.success);
      setOpenModal(null);
    }
    if (renameState.error) toast.error(renameState.error);
  }, [renameState.error, renameState.success]);

  useEffect(() => {
    if (statusState.success) {
      toast.success(statusState.success);
      setOpenModal(null);
    }
    if (statusState.error) toast.error(statusState.error);
  }, [statusState.error, statusState.success]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {isUnresolved ? (
          <>
            <button
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--splity-line)] bg-white px-4 text-sm font-bold text-[var(--splity-ink)] transition hover:bg-[var(--splity-bg)]"
              onClick={() => setOpenModal("edit")}
              type="button"
            >
              <Pencil className="h-4 w-4" />
              {t("common.rename")}
            </button>
            <button
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--splity-navy)] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#15225a]"
              onClick={() => setOpenModal("settling")}
              type="button"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t("groupDetail.markAsSettling")}
            </button>
            <button
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition hover:bg-red-50"
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
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--splity-mint)] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#26764f]"
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
        <Modal onClose={() => setOpenModal(null)} title={t("groupDetail.editGroup")}>
          <form action={renameAction} className="grid gap-4">
            <Input defaultValue={name} label={t("groups.name")} name="name" required />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setOpenModal(null)} type="button" variant="secondary">
                {t("common.cancel")}
              </Button>
              <SubmitButton pendingLabel={t("common.saving")}>{t("common.save")}</SubmitButton>
            </div>
          </form>
        </Modal>
      ) : null}

      {openModal === "settling" ? (
        <Modal onClose={() => setOpenModal(null)} title={t("groupDetail.markAsSettling")}>
          <form action={statusAction} className="grid gap-4">
            <input name="status" type="hidden" value={GROUP_STATUS.settling} />
            <p className="text-sm leading-6 text-[var(--splity-muted)]">
              {t("groupDetail.statusProgressConfirm")}
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setOpenModal(null)} type="button" variant="secondary">
                {t("common.cancel")}
              </Button>
              <SubmitButton pendingLabel={t("settings.updating")}>
                {t("groupDetail.markAsSettling")}
              </SubmitButton>
            </div>
          </form>
        </Modal>
      ) : null}

      {openModal === "settled" ? (
        <Modal onClose={() => setOpenModal(null)} title={t("groupDetail.markAsSettled")}>
          <form action={statusAction} className="grid gap-4">
            <input name="status" type="hidden" value={GROUP_STATUS.settled} />
            <p className="text-sm leading-6 text-[var(--splity-muted)]">
              {t("groupDetail.statusProgressConfirm")}
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setOpenModal(null)} type="button" variant="secondary">
                {t("common.cancel")}
              </Button>
              <SubmitButton pendingLabel={t("settings.updating")}>
                {t("groupDetail.markAsSettled")}
              </SubmitButton>
            </div>
          </form>
        </Modal>
      ) : null}

      {openModal === "delete" ? (
        <Modal onClose={() => setOpenModal(null)} title={t("groups.deleteTitle")}>
          <form action={deleteGroupAction} className="grid gap-4" onSubmit={() => toast.loading(t("groups.deleting"))}>
            <input name="groupId" type="hidden" value={groupId} />
            <p className="text-sm leading-6 text-[var(--splity-muted)]">
              {t("groupDetail.deleteGroupBody")}
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setOpenModal(null)} type="button" variant="secondary">
                {t("common.cancel")}
              </Button>
              <SubmitButton danger pendingLabel={t("common.sending")}>
                {t("groups.deleteGroup")}
              </SubmitButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
