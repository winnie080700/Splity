"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { en, type MessageKey } from "@/lib/i18n/messages/en";
import { zh } from "@/lib/i18n/messages/zh";
import {
  createShare,
  deactivateShare,
  regenerateShare,
  type SettlementSharePayload,
} from "@/lib/services/settlement-shares";
import { formDataObject } from "@/lib/validation/form-data";

export type ShareActionState = {
  error: string | null;
  shareToken: string | null;
  success: string | null;
};

const ok = (success: string, shareToken: string | null = null): ShareActionState => ({
  error: null,
  shareToken,
  success,
});
const fail = (error: string): ShareActionState => ({ error, shareToken: null, success: null });

async function serverT(key: MessageKey) {
  const locale = (await cookies()).get("splity.locale")?.value;
  return locale === "zh" ? (zh[key] ?? en[key]) : en[key];
}

function normalizeDate(value: FormDataEntryValue | null, endOfDay = false) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return `${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`;
}

const shareFormSchema = z.object({
  fromDateUtc: z
    .custom<FormDataEntryValue | null>()
    .transform((value) => normalizeDate(value)),
  toDateUtc: z
    .custom<FormDataEntryValue | null>()
    .transform((value) => normalizeDate(value, true)),
  creatorName: z.coerce.string(),
  payeeName: z.coerce.string(),
  paymentMethod: z.coerce.string(),
  accountName: z.coerce.string(),
  accountNumber: z.coerce.string(),
  notes: z.coerce.string(),
  paymentQrDataUrl: z.coerce.string(),
  receiverPaymentInfosJson: z.coerce.string(),
});

function inputFromForm(formData: FormData): SettlementSharePayload {
  return shareFormSchema.parse(
    formDataObject(formData, [
      "fromDateUtc",
      "toDateUtc",
      "creatorName",
      "payeeName",
      "paymentMethod",
      "accountName",
      "accountNumber",
      "notes",
      "paymentQrDataUrl",
      "receiverPaymentInfosJson",
    ])
  );
}

export async function createShareAction(
  groupId: string,
  _prevState: ShareActionState,
  formData: FormData
): Promise<ShareActionState> {
  try {
    const shareToken = await createShare(groupId, inputFromForm(formData));
    revalidatePath(`/groups/${groupId}/share`);
    revalidatePath(`/groups/${groupId}`);
    return ok(await serverT("share.actionGenerated"), shareToken);
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
    const shareToken = await regenerateShare(groupId, inputFromForm(formData));
    revalidatePath(`/groups/${groupId}/share`);
    revalidatePath(`/groups/${groupId}`);
    return ok(await serverT("share.actionRegenerated"), shareToken);
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
  if (error instanceof Error && error.message in en) {
    return serverT(error.message as MessageKey);
  }

  return serverT(fallbackKey);
}
