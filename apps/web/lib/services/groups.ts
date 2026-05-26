import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { GROUP_STATUS, type GroupStatus } from "@/lib/domain/status";
import { normalizeUsername } from "@/lib/services/users";
export {
  GROUP_STATUS,
  GROUP_STATUS_LABELS,
  GROUP_STATUS_OPTIONS,
  isGroupStatus,
  toGroupStatus,
  type GroupStatus,
} from "@/lib/domain/status";

export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type GroupSummary = Group & {
  billCount: number;
  participantCount: number;
};

function readCount(value: unknown) {
  if (Array.isArray(value)) {
    const first = value[0] as { count?: unknown } | undefined;
    return typeof first?.count === "number" ? first.count : 0;
  }

  return 0;
}

export async function listAccessibleGroups() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id, name, status, created_at_utc, created_by_user_id")
    .order("created_at_utc", { ascending: false });

  if (error) throw error;
  return data;
}

export async function listAccessibleGroupSummaries(): Promise<GroupSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id, name, status, created_at_utc, created_by_user_id, participants(count), bills(count)")
    .order("created_at_utc", { ascending: false });

  if (error) throw error;

  return data.map((row) => {
    const joined = row as typeof row & {
      bills?: unknown;
      participants?: unknown;
    };

    return {
      id: row.id,
      name: row.name,
      status: row.status,
      created_at_utc: row.created_at_utc,
      created_by_user_id: row.created_by_user_id,
      billCount: readCount(joined.bills),
      participantCount: readCount(joined.participants),
    };
  });
}

export async function getGroup(groupId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id, name, status, created_at_utc, created_by_user_id")
    .eq("id", groupId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createGroup(input: { name: string }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("You must be signed in.");

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("name, username")
    .eq("id", user.id)
    .maybeSingle();

  if (appUserError) throw appUserError;

  const { data, error } = await supabase
    .from("groups")
    .insert({
      name: input.name,
      created_by_user_id: user.id,
      status: GROUP_STATUS.unresolved,
    })
    .select("id, name, status, created_at_utc, created_by_user_id")
    .single();

  if (error) throw error;

  const participantName =
    appUser?.name ??
    (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null) ??
    user.email ??
    "You";
  const username = normalizeUsername(
    appUser?.username ??
      (typeof user.user_metadata?.username === "string" ? user.user_metadata.username : null)
  );

  const { error: participantError } = await supabase.from("participants").insert({
    group_id: data.id,
    name: participantName,
    username,
    invited_user_id: user.id,
    invitation_status: 2,
  });

  if (participantError) {
    await supabase.from("groups").delete().eq("id", data.id);
    throw participantError;
  }

  return data;
}

export async function updateGroup(groupId: string, input: { name: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .update({ name: input.name })
    .eq("id", groupId)
    .select("id, name, status, created_at_utc, created_by_user_id")
    .single();

  if (error) throw error;
  return data;
}

export async function updateGroupStatus(groupId: string, status: GroupStatus) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .update({ status })
    .eq("id", groupId)
    .select("id, name, status, created_at_utc, created_by_user_id")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGroup(groupId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) throw error;
}
