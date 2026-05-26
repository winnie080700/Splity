import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { GROUP_STATUS, type InvitationStatus } from "@/lib/domain/status";
import { getGroup } from "@/lib/services/groups";
import { normalizeUsername, searchUserByUsername } from "@/lib/services/users";

export type Participant = Database["public"]["Tables"]["participants"]["Row"];
export type { InvitationStatus } from "@/lib/domain/status";

export class GroupLockedError extends Error {
  constructor() {
    super("This group is locked because settlement has already started.");
  }
}

export class InvitedParticipantEditError extends Error {
  constructor() {
    super("Invited participant names cannot be edited.");
  }
}

async function requireEditableGroup(groupId: string) {
  const group = await getGroup(groupId);
  if (!group) throw new Error("Group not found.");
  if (group.status !== GROUP_STATUS.unresolved) throw new GroupLockedError();
  return group;
}

async function resolveInvitation(input: {
  groupId: string;
  username: string | null;
  previousInvitedUserId?: string | null;
  previousStatus?: number | null;
}) {
  if (!input.username) {
    return { invitedUserId: null, invitationStatus: 0 as InvitationStatus };
  }

  const group = await getGroup(input.groupId);
  const found = await searchUserByUsername(input.username);
  if (!found) {
    return { invitedUserId: null, invitationStatus: 0 as InvitationStatus };
  }

  if (group?.created_by_user_id && found.id === group.created_by_user_id) {
    return { invitedUserId: found.id, invitationStatus: 2 as InvitationStatus };
  }

  if (
    input.previousInvitedUserId === found.id &&
    (input.previousStatus === 0 ||
      input.previousStatus === 1 ||
      input.previousStatus === 2 ||
      input.previousStatus === 3)
  ) {
    return {
      invitedUserId: found.id,
      invitationStatus: input.previousStatus as InvitationStatus,
    };
  }

  return { invitedUserId: found.id, invitationStatus: 1 as InvitationStatus };
}

export async function listParticipants(groupId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("participants")
    .select("id, group_id, name, username, invited_user_id, invitation_status, created_at_utc")
    .eq("group_id", groupId)
    .order("created_at_utc", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createParticipant(input: {
  groupId: string;
  name: string;
  username?: string | null;
}) {
  await requireEditableGroup(input.groupId);
  const username = normalizeUsername(input.username);
  const invitation = await resolveInvitation({
    groupId: input.groupId,
    username,
  });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("participants")
    .insert({
      group_id: input.groupId,
      name: input.name,
      username,
      invited_user_id: invitation.invitedUserId,
      invitation_status: invitation.invitationStatus,
    })
    .select("id, group_id, name, username, invited_user_id, invitation_status, created_at_utc")
    .single();

  if (error) throw error;
  return data;
}

export async function updateParticipant(
  groupId: string,
  participantId: string,
  input: { name: string; username?: string | null }
) {
  await requireEditableGroup(groupId);

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("participants")
    .select("id, invited_user_id, invitation_status")
    .eq("id", participantId)
    .eq("group_id", groupId)
    .single();

  if (currentError) throw currentError;
  if (current.invited_user_id) throw new InvitedParticipantEditError();

  const username = normalizeUsername(input.username);
  const invitation = await resolveInvitation({
    groupId,
    username,
    previousInvitedUserId: current.invited_user_id,
    previousStatus: current.invitation_status,
  });

  const { data, error } = await supabase
    .from("participants")
    .update({
      name: input.name,
      username,
      invited_user_id: invitation.invitedUserId,
      invitation_status: invitation.invitationStatus,
    })
    .eq("id", participantId)
    .eq("group_id", groupId)
    .select("id, group_id, name, username, invited_user_id, invitation_status, created_at_utc")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteParticipant(groupId: string, participantId: string) {
  await requireEditableGroup(groupId);

  const supabase = await createClient();
  const { error } = await supabase
    .from("participants")
    .delete()
    .eq("id", participantId)
    .eq("group_id", groupId);

  if (error) throw error;
}
