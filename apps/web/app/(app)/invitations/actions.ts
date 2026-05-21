"use server";

import { revalidatePath } from "next/cache";

import { acceptInvitation, declineInvitation } from "@/lib/services/invitations";

export async function acceptInvitationAction(formData: FormData) {
  const participantId = String(formData.get("participantId") ?? "");
  if (!participantId) throw new Error("Invitation is required.");

  await acceptInvitation(participantId);
  revalidatePath("/invitations");
  revalidatePath("/dashboard");
}

export async function declineInvitationAction(formData: FormData) {
  const participantId = String(formData.get("participantId") ?? "");
  if (!participantId) throw new Error("Invitation is required.");

  await declineInvitation(participantId);
  revalidatePath("/invitations");
  revalidatePath("/dashboard");
}
