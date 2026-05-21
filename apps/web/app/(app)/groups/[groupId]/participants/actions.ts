"use server";

import { revalidatePath } from "next/cache";

import {
  createParticipant,
  deleteParticipant,
  updateParticipant,
} from "@/lib/services/participants";
import { searchUserByUsername } from "@/lib/services/users";

export type ParticipantActionState = {
  error: string | null;
  lookup: { id: string; name: string; username: string } | null;
  success: string | null;
};

const emptyState: ParticipantActionState = {
  error: null,
  lookup: null,
  success: null,
};

export async function addParticipantAction(
  groupId: string,
  _prevState: ParticipantActionState,
  formData: FormData
): Promise<ParticipantActionState> {
  const intent = String(formData.get("intent") ?? "add");
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();

  if (intent === "lookup") {
    if (!username) {
      return { ...emptyState, error: "Username is required for lookup." };
    }

    try {
      const lookup = await searchUserByUsername(username);
      if (!lookup) {
        return { ...emptyState, error: "No user found for that username." };
      }
      return { ...emptyState, lookup };
    } catch (error) {
      return { ...emptyState, error: getErrorMessage(error, "Lookup failed.") };
    }
  }

  if (name.length < 1 || name.length > 150) {
    return { ...emptyState, error: "Participant name must be 1-150 characters." };
  }

  try {
    await createParticipant({ groupId, name, username });
    revalidatePath(`/groups/${groupId}`);
    return { ...emptyState, success: "Participant added." };
  } catch (error) {
    return { ...emptyState, error: toParticipantError(error) };
  }
}

export async function renameParticipantAction(
  groupId: string,
  participantId: string,
  _prevState: ParticipantActionState,
  formData: FormData
): Promise<ParticipantActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();

  if (name.length < 1 || name.length > 150) {
    return { ...emptyState, error: "Participant name must be 1-150 characters." };
  }

  if (name.startsWith("@")) {
    return {
      ...emptyState,
      error:
        "Manual participant rename cannot start with @. Use the username field to invite a user.",
    };
  }

  try {
    await updateParticipant(groupId, participantId, { name, username });
    revalidatePath(`/groups/${groupId}`);
    return { ...emptyState, success: "Participant updated." };
  } catch (error) {
    return { ...emptyState, error: toParticipantError(error) };
  }
}

export async function removeParticipantAction(
  groupId: string,
  participantId: string,
  _prevState: ParticipantActionState
): Promise<ParticipantActionState> {
  try {
    await deleteParticipant(groupId, participantId);
    revalidatePath(`/groups/${groupId}`);
    return { ...emptyState, success: "Participant removed." };
  } catch (error) {
    return { ...emptyState, error: toParticipantError(error) };
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function toParticipantError(error: unknown) {
  const message = getErrorMessage(error, "Participant action failed.");
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  if (code === "23503" || /foreign key/i.test(message)) {
    return "Cannot remove this participant because they appear on a bill or settlement transfer.";
  }

  if (code === "23505" || /duplicate|unique/i.test(message)) {
    return "A participant with that name already exists in this group.";
  }

  return message;
}
