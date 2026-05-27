"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { en, type MessageKey } from "@/lib/i18n/messages/en";
import { zh } from "@/lib/i18n/messages/zh";
import {
  deleteGroup,
  getGroup,
  GROUP_STATUS,
  toGroupStatus,
  updateGroup,
  updateGroupStatus,
} from "@/lib/services/groups";
import { formDataObject } from "@/lib/validation/form-data";

export type GroupActionState = {
  error: string | null;
  success: string | null;
};

const ok = (success: string): GroupActionState => ({ error: null, success });
const fail = (error: string): GroupActionState => ({ error, success: null });
const renameGroupSchema = z.object({
  name: z.string().trim().min(1, "groupDetail.error.groupNameLength").max(200, "groupDetail.error.groupNameLength"),
});
const statusFormSchema = z.object({
  status: z.coerce.number().refine((value) => value === GROUP_STATUS.settling || value === GROUP_STATUS.settled, {
    message: "groupDetail.error.statusForwardOnly",
  }),
});
const deleteGroupSchema = z.object({
  groupId: z.string().min(1),
});

async function serverT(key: MessageKey) {
  const locale = (await cookies()).get("splity.locale")?.value;
  return locale === "zh" ? (zh[key] ?? en[key]) : en[key];
}

export async function renameGroupAction(
  groupId: string,
  _prevState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  const result = renameGroupSchema.safeParse(formDataObject(formData, ["name"]));
  if (!result.success) {
    return fail(await serverT("groupDetail.error.groupNameLength"));
  }

  try {
    const { name } = result.data;
    await updateGroup(groupId, { name });
    revalidatePath("/dashboard");
    revalidatePath(`/groups/${groupId}`);
    return ok(await serverT("groupDetail.action.groupRenamed"));
  } catch (error) {
    return fail(await getErrorMessage(error, "groupDetail.action.renameFailed"));
  }
}

export async function changeStatusAction(
  groupId: string,
  _prevState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  try {
    const result = statusFormSchema.safeParse(formDataObject(formData, ["status"]));
    if (!result.success) return fail(await serverT("groupDetail.error.statusForwardOnly"));

    const status = toGroupStatus(result.data.status);
    const group = await getGroup(groupId);
    if (!group) return fail(await serverT("groupDetail.error.groupNotFound"));
    if (
      (group.status !== GROUP_STATUS.unresolved || status !== GROUP_STATUS.settling) &&
      (group.status !== GROUP_STATUS.settling || status !== GROUP_STATUS.settled)
    ) {
      return fail(await serverT("groupDetail.error.statusForwardOnly"));
    }

    await updateGroupStatus(groupId, status);
    revalidatePath("/dashboard");
    revalidatePath(`/groups/${groupId}`);
    return ok(await serverT("groupDetail.action.statusUpdated"));
  } catch (error) {
    return fail(await getErrorMessage(error, "groupDetail.action.statusFailed"));
  }
}

export async function deleteGroupAction(formData: FormData) {
  const result = deleteGroupSchema.safeParse(formDataObject(formData, ["groupId"]));
  if (!result.success) return;

  await deleteGroup(result.data.groupId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

async function getErrorMessage(error: unknown, fallbackKey: MessageKey) {
  return error instanceof Error ? error.message : serverT(fallbackKey);
}
