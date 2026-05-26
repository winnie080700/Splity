"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createGroup, deleteGroup, updateGroup } from "@/lib/services/groups";

export async function createGroupFromGroupsAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();

  if (name.length < 1 || name.length > 200) {
    return;
  }

  const group = await createGroup({ name });
  revalidatePath("/groups");
  revalidatePath("/dashboard");
  redirect(`/groups/${group.id}`);
}

export type GroupsPageActionState = {
  error: string | null;
  success: string | null;
};

const ok = (success: string): GroupsPageActionState => ({ error: null, success });
const fail = (error: string): GroupsPageActionState => ({ error, success: null });

export async function renameGroupFromGroupsAction(
  _prevState: GroupsPageActionState,
  formData: FormData
): Promise<GroupsPageActionState> {
  const groupId = String(formData.get("groupId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!groupId) return fail("Missing group.");
  if (name.length < 1 || name.length > 200) {
    return fail("Group name must be 1-200 characters.");
  }

  try {
    await updateGroup(groupId, { name });
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    revalidatePath(`/groups/${groupId}`);
    return ok("Group renamed.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to rename group.");
  }
}

export async function deleteGroupFromGroupsAction(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  if (!groupId) return;

  await deleteGroup(groupId);
  revalidatePath("/groups");
  revalidatePath("/dashboard");
  redirect("/groups");
}
