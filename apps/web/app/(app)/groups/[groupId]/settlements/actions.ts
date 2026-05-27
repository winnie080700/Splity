"use server";

import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";

import { serverErrorMessage, serverT } from "@/lib/i18n/server";
import {
  markSettlementPaid,
  markSettlementReceived,
  type SettlementActionInput,
} from "@/lib/services/settlements";
import { formDataObject } from "@/lib/validation/form-data";
import { zodErrorMessage } from "@/lib/validation/zod";

export type SettlementActionState = {
  error: string | null;
  success: string | null;
};

const ok = (success: string): SettlementActionState => ({ error: null, success });
const fail = (error: string): SettlementActionState => ({ error, success: null });

const nullableString = z.coerce
  .string()
  .trim()
  .transform((value) => (value.length ? value : null));

const settlementActionSchema = z.object({
  fromParticipantId: z.coerce.string().min(1, "settlements.error.participantRequired"),
  toParticipantId: z.coerce.string().min(1, "settlements.error.participantRequired"),
  amount: z.coerce.string().refine((value) => value.length > 0 && Number.isFinite(Number(value)), {
    message: "settlements.error.amountInvalid",
  }),
  fromDateUtc: nullableString,
  toDateUtc: nullableString,
  actorParticipantId: z.coerce.string().min(1, "settlements.error.participantRequired"),
  proofScreenshotDataUrl: nullableString,
});

function inputFromForm(formData: FormData): SettlementActionInput {
  return settlementActionSchema.parse(
    formDataObject(formData, [
      "fromParticipantId",
      "toParticipantId",
      "amount",
      "fromDateUtc",
      "toDateUtc",
      "actorParticipantId",
      "proofScreenshotDataUrl",
    ])
  );
}

export async function markPaidAction(
  groupId: string,
  _prevState: SettlementActionState,
  formData: FormData
): Promise<SettlementActionState> {
  try {
    const input = inputFromForm(formData);
    await markSettlementPaid(groupId, input);
    revalidatePath(`/groups/${groupId}/settlements`);
    revalidatePath(`/groups/${groupId}`);
    return ok(await serverT("settlements.action.markedPaid"));
  } catch (error) {
    return fail(await getSettlementErrorMessage(error, "settlements.error.markPaidFailed"));
  }
}

export async function markReceivedAction(
  groupId: string,
  _prevState: SettlementActionState,
  formData: FormData
): Promise<SettlementActionState> {
  try {
    const input = inputFromForm(formData);
    await markSettlementReceived(groupId, input);
    revalidatePath(`/groups/${groupId}/settlements`);
    revalidatePath(`/groups/${groupId}`);
    return ok(await serverT("settlements.action.markedReceived"));
  } catch (error) {
    return fail(await getSettlementErrorMessage(error, "settlements.error.markReceivedFailed"));
  }
}

async function getSettlementErrorMessage(error: unknown, fallback: "settlements.error.markPaidFailed" | "settlements.error.markReceivedFailed") {
  if (error instanceof ZodError) {
    return zodErrorMessage(error, fallback);
  }

  return serverErrorMessage(error, fallback);
}
