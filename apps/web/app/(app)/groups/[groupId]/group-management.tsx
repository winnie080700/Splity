"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { GROUP_STATUS_OPTIONS } from "@/lib/domain/status";
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

  return (
    <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Group settings</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Rename, change settlement state, or delete this group.
        </p>
      </div>

      <form action={renameAction} className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-3">
          <Alert tone="error">{renameState.error}</Alert>
          <Alert tone="success">{renameState.success}</Alert>
          <Input defaultValue={name} label="Name" name="name" required />
        </div>
        <div className="flex items-end">
          <SubmitButton label="Rename" pendingLabel="Saving..." />
        </div>
      </form>

      <form action={statusAction} className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-3">
          <Alert tone="error">{statusState.error}</Alert>
          <Alert tone="success">{statusState.success}</Alert>
          <Select
            defaultValue={String(status)}
            label="Status"
            name="status"
            options={GROUP_STATUS_OPTIONS}
          />
        </div>
        <div className="flex items-end">
          <SubmitButton label="Update status" pendingLabel="Updating..." />
        </div>
      </form>

      <div className="flex justify-end border-t border-zinc-100 pt-4">
        <ConfirmDialog
          action={deleteGroupAction}
          confirmLabel="Delete group"
          title="Delete this group?"
          triggerLabel="Delete group"
        >
          <input name="groupId" type="hidden" value={groupId} />
          This will delete {participantCount} participant
          {participantCount === 1 ? "" : "s"}, all bills, and all settlement
          data for this group.
        </ConfirmDialog>
      </div>
    </section>
  );
}
