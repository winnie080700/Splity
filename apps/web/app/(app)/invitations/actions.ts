"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { en, type MessageKey } from "@/lib/i18n/messages/en";
import { zh } from "@/lib/i18n/messages/zh";
import { acceptInvitation, declineInvitation } from "@/lib/services/invitations";
import { formDataObject } from "@/lib/validation/form-data";

export type InvitationActionState = {
  error: string | null;
  success: string | null;
};

const emptyState: InvitationActionState = { error: null, success: null };
const invitationFormSchema = z.object({
  participantId: z.coerce.string().min(1),
});

async function serverT(key: MessageKey) {
  const locale = (await cookies()).get("splity.locale")?.value;
  return locale === "zh" ? (zh[key] ?? en[key]) : en[key];
}

export async function acceptInvitationAction(
  _prevState: InvitationActionState,
  formData: FormData
): Promise<InvitationActionState> {
  const result = invitationFormSchema.safeParse(formDataObject(formData, ["participantId"]));
  if (!result.success) return { ...emptyState, error: await serverT("invitations.errorRequired") };

  try {
    await acceptInvitation(result.data.participantId);
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
  const result = invitationFormSchema.safeParse(formDataObject(formData, ["participantId"]));
  if (!result.success) return { ...emptyState, error: await serverT("invitations.errorRequired") };

  try {
    await declineInvitation(result.data.participantId);
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
