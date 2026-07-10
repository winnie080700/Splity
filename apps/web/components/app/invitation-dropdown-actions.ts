"use server";

import { listMyInvitations, listSentInvitations } from "@/lib/services/invitations";

export async function loadInvitationDropdown() {
  const [invitations, sentInvitations] = await Promise.allSettled([
    listMyInvitations(),
    listSentInvitations(),
  ]);

  return {
    invitations: invitations.status === "fulfilled" ? invitations.value : null,
    sentInvitations: sentInvitations.status === "fulfilled" ? sentInvitations.value : null,
  };
}
