import { getUser } from "@/lib/auth/server";
import { getGroup } from "@/lib/services/groups";
import { createClient } from "@/lib/supabase/server";
import { deriveGroupPermissions } from "@/lib/services/group-permission-rules";

export { deriveGroupPermissions } from "@/lib/services/group-permission-rules";

export class GroupPermissionError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "GroupPermissionError";
  }
}

export async function getGroupPermissions(groupId: string) {
  const [user, group] = await Promise.all([getUser(), getGroup(groupId)]);
  if (!user || !group) throw new GroupPermissionError();

  const organizer = group.created_by_user_id === user.id;
  let member = organizer;
  if (!organizer) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("participants")
      .select("id")
      .eq("group_id", groupId)
      .eq("invited_user_id", user.id)
      .eq("invitation_status", 2)
      .maybeSingle();
    if (error || !data) throw new GroupPermissionError();
    member = true;
  }

  const permissions = deriveGroupPermissions({ member, organizer, status: group.status });
  return {
    ...permissions,
    group,
    organizer,
    userId: user.id,
  };
}

export async function requireGroupOrganizer(groupId: string) {
  const permissions = await getGroupPermissions(groupId);
  if (!permissions.organizer) throw new GroupPermissionError();
  return permissions;
}

export async function requireBillEditor(groupId: string) {
  const permissions = await getGroupPermissions(groupId);
  if (!permissions.canWriteBills) throw new GroupPermissionError();
  return permissions;
}
