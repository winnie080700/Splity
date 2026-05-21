import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { GROUP_STATUS, type GroupStatus } from "@/lib/domain/status";
export {
  GROUP_STATUS,
  GROUP_STATUS_LABELS,
  GROUP_STATUS_OPTIONS,
  isGroupStatus,
  toGroupStatus,
  type GroupStatus,
} from "@/lib/domain/status";

export type Group = Database["public"]["Tables"]["groups"]["Row"];

export async function listAccessibleGroups() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id, name, status, created_at_utc, created_by_user_id")
    .order("created_at_utc", { ascending: false });

  if (error) throw error;
  return data;
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
