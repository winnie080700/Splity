"use server";

import { revalidatePath } from "next/cache";

import {
  markSettlementPaid,
  markSettlementReceived,
  type SettlementActionInput,
} from "@/lib/services/settlements";

export type SettlementActionState = {
  error: string | null;
  success: string | null;
};

const ok = (success: string): SettlementActionState => ({ error: null, success });
const fail = (error: string): SettlementActionState => ({ error, success: null });

function inputFromForm(formData: FormData): SettlementActionInput {
  return {
    fromParticipantId: String(formData.get("fromParticipantId") ?? ""),
    toParticipantId: String(formData.get("toParticipantId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    fromDateUtc: String(formData.get("fromDateUtc") ?? "") || null,
    toDateUtc: String(formData.get("toDateUtc") ?? "") || null,
    actorParticipantId: String(formData.get("actorParticipantId") ?? ""),
    proofScreenshotDataUrl: String(formData.get("proofScreenshotDataUrl") ?? "") || null,
  };
}

function validateInput(input: SettlementActionInput) {
  if (!input.fromParticipantId || !input.toParticipantId || !input.actorParticipantId) {
    throw new Error("Participant selection is required.");
  }

  if (!input.amount || Number.isNaN(Number(input.amount))) {
    throw new Error("Transfer amount is invalid.");
  }
}

export async function markPaidAction(
  groupId: string,
  _prevState: SettlementActionState,
  formData: FormData
): Promise<SettlementActionState> {
  try {
    const input = inputFromForm(formData);
    validateInput(input);
    await markSettlementPaid(groupId, input);
    revalidatePath(`/groups/${groupId}/settlements`);
    revalidatePath(`/groups/${groupId}`);
    return ok("Transfer marked as paid.");
  } catch (error) {
    return fail(getErrorMessage(error, "Failed to mark transfer as paid."));
  }
}

export async function markReceivedAction(
  groupId: string,
  _prevState: SettlementActionState,
  formData: FormData
): Promise<SettlementActionState> {
  try {
    const input = inputFromForm(formData);
    validateInput(input);
    await markSettlementReceived(groupId, input);
    revalidatePath(`/groups/${groupId}/settlements`);
    revalidatePath(`/groups/${groupId}`);
    return ok("Transfer marked as received.");
  } catch (error) {
    return fail(getErrorMessage(error, "Failed to mark transfer as received."));
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
