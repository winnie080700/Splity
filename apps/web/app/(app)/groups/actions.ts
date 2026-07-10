"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { serverErrorMessage, serverT } from "@/lib/i18n/server";
import { deleteGroup, updateGroup } from "@/lib/services/groups";
import { formDataObject } from "@/lib/validation/form-data";

const groupFormSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

const groupIdFormSchema = z.object({
  groupId: z.string().min(1),
});

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
  const result = groupIdFormSchema.merge(groupFormSchema).safeParse(formDataObject(formData, ["groupId", "name"]));

  if (!result.success && result.error.issues.some((issue) => issue.path[0] === "groupId")) {
    return fail(await serverT("groupDetail.error.groupNotFound"));
  }
  if (!result.success) {
    return fail(await serverT("groupDetail.error.groupNameLength"));
  }

  try {
    const { groupId, name } = result.data;
    await updateGroup(groupId, { name });
    revalidatePath("/groups");
    revalidatePath(`/groups/${groupId}`);
    return ok(await serverT("groupDetail.action.groupRenamed"));
  } catch (error) {
    return fail(await serverErrorMessage(error, "groupDetail.action.renameFailed"));
  }
}

export async function deleteGroupFromGroupsAction(formData: FormData) {
  const result = groupIdFormSchema.safeParse(formDataObject(formData, ["groupId"]));
  if (!result.success) return;

  await deleteGroup(result.data.groupId);
  revalidatePath("/groups");
  redirect("/groups");
}
