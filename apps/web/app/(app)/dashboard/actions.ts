"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createGroup } from "@/lib/services/groups";

export type CreateGroupState = {
  error: string | null;
};

export async function createGroupAction(
  _prevState: CreateGroupState,
  formData: FormData
): Promise<CreateGroupState> {
  const name = String(formData.get("name") ?? "").trim();

  if (name.length < 1 || name.length > 200) {
    return { error: "Group name must be 1-200 characters." };
  }

  try {
    const group = await createGroup({ name });
    revalidatePath("/dashboard");
    redirect(`/groups/${group.id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: getErrorMessage(error, "Failed to create group.") };
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}
