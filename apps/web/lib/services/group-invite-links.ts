import { getSiteUrl } from "@/lib/auth/site-url";
import { requireGroupOrganizer } from "@/lib/services/group-permissions";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export async function createGroupInviteLink(groupId: string) {
  const { userId } = await requireGroupOrganizer(groupId);
  const supabase = createServiceRoleClient();
  const { data: existing, error: existingError } = await supabase
    .from("group_invite_links")
    .select("code")
    .eq("group_id", groupId)
    .is("revoked_at_utc", null)
    .gt("expires_at_utc", new Date().toISOString())
    .order("created_at_utc", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.code) return `${await getSiteUrl()}/i/${existing.code}`;

  const code = Buffer.from(crypto.getRandomValues(new Uint8Array(12))).toString("base64url");
  const { error } = await supabase.from("group_invite_links").insert({
    code,
    created_by_user_id: userId,
    group_id: groupId,
  });
  if (error) throw error;
  return `${await getSiteUrl()}/i/${code}`;
}

export async function acceptGroupInviteLink(code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_group_invite_link", { p_code: code });
  if (error) throw error;
  return data;
}

export async function getGroupInviteLinkInfo(code: string) {
  const service = createServiceRoleClient();
  const { data: link, error } = await service
    .from("group_invite_links")
    .select("group_id")
    .eq("code", code)
    .is("revoked_at_utc", null)
    .gt("expires_at_utc", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!link) return null;
  const { data: group, error: groupError } = await service
    .from("groups")
    .select("name")
    .eq("id", link.group_id)
    .maybeSingle();
  if (groupError) throw groupError;
  return {
    groupId: link.group_id,
    groupName: group?.name ?? "",
  };
}
