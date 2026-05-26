"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { en, type MessageKey } from "@/lib/i18n/messages/en";
import { zh } from "@/lib/i18n/messages/zh";
import { acceptInvitation, declineInvitation } from "@/lib/services/invitations";

export type InvitationActionState = {
  error: string | null;
  success: string | null;
};

const emptyState: InvitationActionState = { error: null, success: null };

async function serverT(key: MessageKey) {
  const locale = (await cookies()).get("splity.locale")?.value;
  return locale === "zh" ? (zh[key] ?? en[key]) : en[key];
}

export async function acceptInvitationAction(
  _prevState: InvitationActionState,
  formData: FormData
): Promise<InvitationActionState> {
  const participantId = String(formData.get("participantId") ?? "");
  if (!participantId) return { ...emptyState, error: await serverT("invitations.errorRequired") };

  try {
    await acceptInvitation(participantId);
    revalidatePath("/invitations");
    revalidatePath("/dashboard");
    return { ...emptyState, success: await serverT("invitations.accepted") };
  } catch (error) {
    return {
      ...emptyState,
      error: error instanceof Error ? error.message : await serverT("invitations.acceptFailed"),
    };
  }
}

export async function declineInvitationAction(
  _prevState: InvitationActionState,
  formData: FormData
): Promise<InvitationActionState> {
  const participantId = String(formData.get("participantId") ?? "");
  if (!participantId) return { ...emptyState, error: await serverT("invitations.errorRequired") };

  try {
    await declineInvitation(participantId);
    revalidatePath("/invitations");
    revalidatePath("/dashboard");
    return { ...emptyState, success: await serverT("invitations.declined") };
  } catch (error) {
    return {
      ...emptyState,
      error: error instanceof Error ? error.message : await serverT("invitations.declineFailed"),
    };
  }
}
