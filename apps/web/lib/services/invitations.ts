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

export async function listSentInvitations(): Promise<SentInvitation[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("Not authenticated.");

  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select("id, name")
    .eq("created_by_user_id", user.id);

  if (groupsError) throw groupsError;
  if (!groups?.length) return [];

  const groupNameById = new Map(groups.map((group) => [group.id, group.name]));
  const { data, error } = await supabase
    .from("participants")
    .select("id, group_id, name, username, invited_user_id, invitation_status, created_at_utc")
    .in(
      "group_id",
      groups.map((group) => group.id)
    )
    .not("invited_user_id", "is", null)
    .neq("invited_user_id", user.id)
    .order("created_at_utc", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    createdAtUtc: row.created_at_utc,
    groupId: row.group_id,
    groupName: groupNameById.get(row.group_id) ?? "",
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
