import { createClient } from "@/lib/supabase/server";

export type Invitation = {
  participantId: string;
  groupId: string;
  groupName: string;
  invitedByName: string;
  createdAtUtc: string;
};

type InvitationRow = {
  participant_id: string;
  group_id: string;
  group_name: string;
  invited_by_name: string;
  created_at_utc: string;
};

function toInvitation(row: InvitationRow): Invitation {
  return {
    participantId: row.participant_id,
    groupId: row.group_id,
    groupName: row.group_name,
    invitedByName: row.invited_by_name,
    createdAtUtc: row.created_at_utc,
  };
}

export async function listMyInvitations() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_my_invitations");

  if (error) throw error;
  return ((data ?? []) as InvitationRow[]).map(toInvitation);
}

export async function countMyInvitations() {
  const invitations = await listMyInvitations();
  return invitations.length;
}

export async function acceptInvitation(participantId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invitation", {
    p_participant_id: participantId,
  });

  if (error) throw error;
}

export async function declineInvitation(participantId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_invitation", {
    p_participant_id: participantId,
  });

  if (error) throw error;
}
