"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { en, type MessageKey } from "@/lib/i18n/messages/en";
import { zh } from "@/lib/i18n/messages/zh";
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

async function serverT(key: MessageKey) {
  const locale = (await cookies()).get("splity.locale")?.value;
  return locale === "zh" ? (zh[key] ?? en[key]) : en[key];
}

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
    return ok(await serverT("share.actionGenerated"));
  } catch (error) {
    return fail(await getErrorMessage(error, "share.generateFailed"));
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
    revalidatePath(`/groups/${groupId}`);
    return ok(await serverT("share.actionRegenerated"));
  } catch (error) {
    return fail(await getErrorMessage(error, "share.regenerateFailed"));
  }
}

export async function deactivateShareAction(
  groupId: string,
  _prevState: ShareActionState
): Promise<ShareActionState> {
  try {
    await deactivateShare(groupId);
    revalidatePath(`/groups/${groupId}/share`);
    revalidatePath(`/groups/${groupId}`);
    return ok(await serverT("share.actionDeactivated"));
  } catch (error) {
    return fail(await getErrorMessage(error, "share.deactivateFailed"));
  }
}

async function getErrorMessage(error: unknown, fallbackKey: MessageKey) {
  return error instanceof Error ? error.message : serverT(fallbackKey);
}
