"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import type { Database } from "@/lib/supabase/database.types";
import {
  INVITATION_STATUS_LABELS,
  type InvitationStatus,
} from "@/lib/domain/status";
import {
  addParticipantAction,
  removeParticipantAction,
  renameParticipantAction,
  type ParticipantActionState,
} from "./participants/actions";

type Participant = Database["public"]["Tables"]["participants"]["Row"];

const initialState: ParticipantActionState = {
  error: null,
  lookup: null,
  success: null,
};

function AddButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={disabled || pending} type="submit">
      {pending ? "Adding..." : "Add participant"}
    </Button>
  );
}

function LookupButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      disabled={disabled || pending}
      name="intent"
      type="submit"
      value="lookup"
      variant="secondary"
    >
      {pending ? "Checking..." : "Look up"}
    </Button>
  );
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={disabled || pending} type="submit" variant="secondary">
      {pending ? "Saving..." : "Save"}
    </Button>
  );
}

function RemoveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={disabled || pending} type="submit" variant="ghost">
      {pending ? "Removing..." : "Remove"}
    </Button>
  );
}

function statusTone(status: number) {
  if (status === 2) return "green";
  if (status === 1) return "amber";
  if (status === 3) return "red";
  return "neutral";
}

export function ParticipantsForm({
  canEdit,
  groupId,
  participants,
}: {
  canEdit: boolean;
  groupId: string;
  participants: Participant[];
}) {
  const [addState, addAction] = useActionState(
    addParticipantAction.bind(null, groupId),
    initialState
  );

  return (
    <section className="grid gap-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Participants</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Add manual participants or invite registered users by username.
          </p>
        </div>
        {!canEdit ? (
          <Badge tone="amber">locked</Badge>
        ) : null}
      </div>

      <form action={addAction} className="grid gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-4">
        <Alert tone="error">{addState.error}</Alert>
        <Alert tone="success">{addState.success}</Alert>
        <div className="grid gap-3 md:grid-cols-2">
          <Input disabled={!canEdit} label="Name" name="name" required />
          <Input
            autoCapitalize="none"
            disabled={!canEdit}
            label="Username"
            name="username"
          />
        </div>
        {addState.lookup ? (
          <div className="rounded-md border border-zinc-200 bg-white p-3 text-sm">
            <p className="font-semibold text-zinc-950">{addState.lookup.name}</p>
            <p className="mt-1 text-zinc-600">@{addState.lookup.username}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <LookupButton disabled={!canEdit} />
          <AddButton disabled={!canEdit} />
        </div>
        {!canEdit ? (
          <p className="text-sm text-amber-700">
            This group is locked because settlement has already started.
          </p>
        ) : null}
      </form>

      {participants.length === 0 ? (
        <EmptyState
          description="Participants appear here after you add names or invite users."
          title="No participants"
        />
      ) : (
        <div className="grid gap-3">
          {participants.map((participant) => (
            <ParticipantRow
              canEdit={canEdit}
              groupId={groupId}
              key={participant.id}
              participant={participant}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ParticipantRow({
  canEdit,
  groupId,
  participant,
}: {
  canEdit: boolean;
  groupId: string;
  participant: Participant;
}) {
  const [renameState, renameAction] = useActionState(
    renameParticipantAction.bind(null, groupId, participant.id),
    initialState
  );
  const [removeState, removeAction] = useActionState(
    removeParticipantAction.bind(null, groupId, participant.id),
    initialState
  );
  const status = participant.invitation_status as InvitationStatus;

  return (
    <div className="rounded-md border border-zinc-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-zinc-950">{participant.name}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {participant.username ? `@${participant.username}` : "manual"}
          </p>
        </div>
        <Badge tone={statusTone(status)}>
          {INVITATION_STATUS_LABELS[status] ?? "none"}
        </Badge>
      </div>

      <div className="mt-3 grid gap-3">
        <Alert tone="error">{renameState.error ?? removeState.error}</Alert>
        <Alert tone="success">{renameState.success ?? removeState.success}</Alert>

        <form action={renameAction} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input
            defaultValue={participant.name}
            disabled={!canEdit}
            label="Name"
            name="name"
            required
          />
          <Input
            autoCapitalize="none"
            defaultValue={participant.username ?? ""}
            disabled={!canEdit}
            label="Username"
            name="username"
          />
          <div className="flex items-end">
            <SaveButton disabled={!canEdit} />
          </div>
        </form>

        <form action={removeAction} className="flex justify-end">
          <RemoveButton disabled={!canEdit} />
        </form>
      </div>
    </div>
  );
}
