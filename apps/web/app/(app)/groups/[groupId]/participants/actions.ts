"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { en, type MessageKey } from "@/lib/i18n/messages/en";
import { zh } from "@/lib/i18n/messages/zh";
import {
  createParticipant,
  deleteParticipant,
  InvitedParticipantEditError,
  updateParticipant,
} from "@/lib/services/participants";
import { searchUserByUsername } from "@/lib/services/users";
import { formDataObject } from "@/lib/validation/form-data";

export type ParticipantActionState = {
  added: { mode: "manual" | "invite"; name: string; username: string | null } | null;
  error: string | null;
  lookup: { id: string; name: string; username: string } | null;
  success: string | null;
};

const emptyState: ParticipantActionState = {
  added: null,
  error: null,
  lookup: null,
  success: null,
};
const participantFormSchema = z.object({
  intent: z.enum(["add", "lookup"]).catch("add"),
  lookupId: z.coerce.string().trim(),
  mode: z.enum(["manual", "invite"]).catch("manual"),
  name: z.coerce.string().trim(),
  username: z.coerce.string().trim(),
});
const participantNameSchema = z.object({
  name: z.coerce.string().trim().min(1).max(150),
});

async function serverT(key: MessageKey) {
  const locale = (await cookies()).get("splity.locale")?.value;
  return locale === "zh" ? (zh[key] ?? en[key]) : en[key];
}

export async function addParticipantAction(
  groupId: string,
  _prevState: ParticipantActionState,
  formData: FormData
): Promise<ParticipantActionState> {
  const { intent, lookupId, mode, name, username } = participantFormSchema.parse(
    formDataObject(formData, ["intent", "mode", "name", "username", "lookupId"])
  );

  if (intent === "lookup") {
    if (!username) {
      return { ...emptyState, error: await serverT("groupDetail.error.lookupUsernameRequired") };
    }

    try {
      const lookup = await searchUserByUsername(username);
      if (!lookup) {
        return { ...emptyState, error: await serverT("groupDetail.error.noUserFound") };
      }
      return { ...emptyState, lookup };
    } catch (error) {
      return { ...emptyState, error: await getErrorMessage(error, "groupDetail.error.lookupFailed") };
    }
  }

  try {
    if (mode === "invite") {
      if (!username) {
        return { ...emptyState, error: await serverT("groupDetail.error.lookupUsernameRequired") };
      }
      if (!lookupId) {
        return { ...emptyState, error: await serverT("groupDetail.error.lookupBeforeInvite") };
      }

      const lookup = await searchUserByUsername(username);
      if (!lookup) {
        return { ...emptyState, error: await serverT("groupDetail.error.noUserFound") };
      }
      if (lookup.id !== lookupId) {
        return { ...emptyState, error: await serverT("groupDetail.error.lookupBeforeInvite") };
      }

      await createParticipant({ groupId, name: lookup.name, username: lookup.username });
      revalidatePath(`/groups/${groupId}`);
      return {
        ...emptyState,
        added: { mode: "invite", name: lookup.name, username: lookup.username },
        success: await serverT("groupDetail.action.participantAdded"),
      };
    }

    if (name.length < 1 || name.length > 150) {
      return { ...emptyState, error: await serverT("groupDetail.error.participantNameLength") };
    }

    await createParticipant({ groupId, name, username: null });
    revalidatePath(`/groups/${groupId}`);
    return {
      ...emptyState,
      added: { mode: "manual", name, username: null },
      success: await serverT("groupDetail.action.participantAdded"),
    };
  } catch (error) {
    return { ...emptyState, error: await toParticipantError(error) };
  }
}

export async function renameParticipantAction(
  groupId: string,
  participantId: string,
  _prevState: ParticipantActionState,
  formData: FormData
): Promise<ParticipantActionState> {
  const result = participantNameSchema.safeParse(formDataObject(formData, ["name"]));

  if (!result.success) {
    return { ...emptyState, error: await serverT("groupDetail.error.participantNameLength") };
  }

  const { name } = result.data;

  if (name.startsWith("@")) {
    return {
      ...emptyState,
      error: await serverT("groupDetail.error.participantAtPrefix"),
    };
  }

  try {
    await updateParticipant(groupId, participantId, { name, username: null });
    revalidatePath(`/groups/${groupId}`);
    return { ...emptyState, success: await serverT("groupDetail.action.participantUpdated") };
  } catch (error) {
    return { ...emptyState, error: await toParticipantError(error) };
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
    return { ...emptyState, success: await serverT("groupDetail.action.participantRemoved") };
  } catch (error) {
    return { ...emptyState, error: await toParticipantError(error) };
  }
}

async function getErrorMessage(error: unknown, fallbackKey: MessageKey) {
  return error instanceof Error ? error.message : serverT(fallbackKey);
}

async function toParticipantError(error: unknown) {
  if (error instanceof InvitedParticipantEditError) {
    return serverT("groupDetail.error.invitedParticipantReadOnly");
  }

  const message = await getErrorMessage(error, "groupDetail.error.participantActionFailed");
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  if (code === "23503" || /foreign key/i.test(message)) {
    return serverT("groupDetail.error.participantInUse");
  }

  if (code === "23505" || /duplicate|unique/i.test(message)) {
    return serverT("groupDetail.error.participantDuplicate");
  }

  return message;
}
