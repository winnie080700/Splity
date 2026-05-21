"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  deleteGroup,
  toGroupStatus,
  updateGroup,
  updateGroupStatus,
} from "@/lib/services/groups";

export type GroupActionState = {
  error: string | null;
  success: string | null;
};

const ok = (success: string): GroupActionState => ({ error: null, success });
const fail = (error: string): GroupActionState => ({ error, success: null });

export async function renameGroupAction(
  groupId: string,
  _prevState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 200) {
    return fail("Group name must be 1-200 characters.");
  }

  try {
    await updateGroup(groupId, { name });
    revalidatePath("/dashboard");
    revalidatePath(`/groups/${groupId}`);
    return ok("Group renamed.");
  } catch (error) {
    return fail(getErrorMessage(error, "Failed to rename group."));
  }
}

export async function changeStatusAction(
  groupId: string,
  _prevState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  try {
    const status = toGroupStatus(String(formData.get("status") ?? ""));
    await updateGroupStatus(groupId, status);
    revalidatePath("/dashboard");
    revalidatePath(`/groups/${groupId}`);
    return ok("Status updated.");
  } catch (error) {
    return fail(getErrorMessage(error, "Failed to update status."));
  }
}

export async function deleteGroupAction(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  if (!groupId) return;

  await deleteGroup(groupId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
