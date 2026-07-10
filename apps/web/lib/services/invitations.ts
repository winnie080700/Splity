import { getUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export type Invitation = {
  participantId: string;
  groupId: string;
  groupName: string;
  invitedByName: string;
  createdAtUtc: string;
};

export type SentInvitation = {
  participantId: string;
  groupId: string;
  groupName: string;
  inviteeName: string;
  inviteeUsername: string | null;
  status: number;
  createdAtUtc: string;
};

type InvitationRow = {
  participant_id: string;
  group_id: string;
  group_name: string;
  invited_by_name: string;
  created_at_utc: string;
};

type SentInvitationRow = {
  id: string;
  group_id: string;
  name: string;
  username: string | null;
  invitation_status: number;
  created_at_utc: string;
  groups: { name: string } | { name: string }[] | null;
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

function groupName(row: SentInvitationRow) {
  return Array.isArray(row.groups) ? (row.groups[0]?.name ?? "") : (row.groups?.name ?? "");
}

export async function listSentInvitations(): Promise<SentInvitation[]> {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) throw new Error("Not authenticated.");

  const { data, error } = await supabase
    .from("participants")
    .select("id, group_id, name, username, invitation_status, created_at_utc, groups!inner(name)")
    .eq("groups.created_by_user_id", user.id)
    .not("invited_user_id", "is", null)
    .neq("invited_user_id", user.id)
    .order("created_at_utc", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as SentInvitationRow[]).map((row) => ({
    createdAtUtc: row.created_at_utc,
    groupId: row.group_id,
    groupName: groupName(row),
    inviteeName: row.name,
    inviteeUsername: row.username,
    participantId: row.id,
    status: row.invitation_status,
  }));
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
