"use server";

import { revalidatePath } from "next/cache";

import {
  createShare,
  deactivateShare,
  regenerateShare,
  type SettlementSharePayload,
} from "@/lib/services/settlement-shares";

export type ShareActionState = {
  error: string | null;
  success: string | null;
};

const ok = (success: string): ShareActionState => ({ error: null, success });
const fail = (error: string): ShareActionState => ({ error, success: null });

function normalizeDate(value: FormDataEntryValue | null, endOfDay = false) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return `${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`;
}

function inputFromForm(formData: FormData): SettlementSharePayload {
  return {
    fromDateUtc: normalizeDate(formData.get("fromDateUtc")),
    toDateUtc: normalizeDate(formData.get("toDateUtc"), true),
    creatorName: String(formData.get("creatorName") ?? ""),
    payeeName: String(formData.get("payeeName") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? ""),
    accountName: String(formData.get("accountName") ?? ""),
    accountNumber: String(formData.get("accountNumber") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    paymentQrDataUrl: String(formData.get("paymentQrDataUrl") ?? ""),
    receiverPaymentInfosJson: String(formData.get("receiverPaymentInfosJson") ?? ""),
  };
}

export async function createShareAction(
  groupId: string,
  _prevState: ShareActionState,
  formData: FormData
): Promise<ShareActionState> {
  try {
    await createShare(groupId, inputFromForm(formData));
    revalidatePath(`/groups/${groupId}/share`);
    revalidatePath(`/groups/${groupId}`);
    return ok("Public share link generated.");
  } catch (error) {
    return fail(getErrorMessage(error, "Failed to generate public share link."));
  }
}

export async function regenerateShareAction(
  groupId: string,
  _prevState: ShareActionState,
  formData: FormData
): Promise<ShareActionState> {
  try {
    await regenerateShare(groupId, inputFromForm(formData));
    revalidatePath(`/groups/${groupId}/share`);
    return ok("Public share link regenerated.");
  } catch (error) {
    return fail(getErrorMessage(error, "Failed to regenerate public share link."));
  }
}

export async function deactivateShareAction(
  groupId: string,
  _prevState: ShareActionState
): Promise<ShareActionState> {
  try {
    await deactivateShare(groupId);
    revalidatePath(`/groups/${groupId}/share`);
    return ok("Public share link deactivated.");
  } catch (error) {
    return fail(getErrorMessage(error, "Failed to deactivate public share link."));
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
