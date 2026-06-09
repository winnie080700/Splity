"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n";
import {
  changeStatusAction,
  deleteGroupAction,
  renameGroupAction,
  type GroupActionState,
} from "./actions";

const initialState: GroupActionState = { error: null, success: null };

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit" variant="secondary">
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function GroupManagement({
  groupId,
  name,
  participantCount,
  status,
}: {
  groupId: string;
  name: string;
  participantCount: number;
  status: number;
}) {
  const [renameState, renameAction] = useActionState(
    renameGroupAction.bind(null, groupId),
    initialState
  );
  const [statusState, statusAction] = useActionState(
    changeStatusAction.bind(null, groupId),
    initialState
  );
  const { t } = useTranslation();
  const statusToastId = "group-management-status";
  const statusOptions = [
    { label: t("groups.status.unresolved"), value: "0" },
    { label: t("groups.status.settling"), value: "1" },
    { label: t("groups.status.settled"), value: "2" },
  ];
  const deleteBody = t("groups.deleteBody")
    .replace("{count}", String(participantCount))
    .replace("{plural}", participantCount === 1 ? "" : "s");

  useEffect(() => {
    if (renameState.success) toast.success(renameState.success);
    if (renameState.error) toast.error(renameState.error);
  }, [renameState.error, renameState.success]);

  useEffect(() => {
    if (statusState.success) {
      toast.dismiss(statusToastId);
      toast.success(statusState.success);
    }
    if (statusState.error) {
      toast.dismiss(statusToastId);
      toast.error(statusState.error);
    }
  }, [statusState.error, statusState.success]);

  return (
    <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">{t("groups.settings")}</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {t("groups.settingsBody")}
        </p>
      </div>

      <form action={renameAction} className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-3">
          <Alert tone="error">{renameState.error}</Alert>
          <Alert tone="success">{renameState.success}</Alert>
          <Input defaultValue={name} label={t("groups.name")} name="name" required />
        </div>
        <div className="flex items-end">
          <SubmitButton label={t("groups.rename")} pendingLabel={t("common.saving")} />
        </div>
      </form>

      <form
        action={statusAction}
        className="grid gap-3 sm:grid-cols-[1fr_auto]"
        onSubmit={() => toast.loading(t("settings.updating"), { id: statusToastId })}
      >
        <div className="grid gap-3">
          <Alert tone="error">{statusState.error}</Alert>
          <Alert tone="success">{statusState.success}</Alert>
          <Select
            defaultValue={String(status)}
            label={t("groups.status")}
            name="status"
            options={statusOptions}
          />
        </div>
        <div className="flex items-end">
          <SubmitButton label={t("groups.updateStatus")} pendingLabel={t("settings.updating")} />
        </div>
      </form>

      <div className="flex justify-end border-t border-zinc-100 pt-4">
        <ConfirmDialog
          action={deleteGroupAction}
          confirmLabel={t("groups.deleteGroup")}
          title={t("groups.deleteTitle")}
          triggerLabel={t("groups.deleteGroup")}
        >
          <input name="groupId" type="hidden" value={groupId} />
          {deleteBody}
        </ConfirmDialog>
      </div>
    </section>
  );
}
