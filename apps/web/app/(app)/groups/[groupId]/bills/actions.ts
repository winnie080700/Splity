"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createBill,
  deleteBill,
  updateBill,
  type BillWriteInput,
} from "@/lib/services/bills";
import { FEE_TYPE, SPLIT_MODE } from "@/lib/calculations/types";

export type BillActionState = {
  error: string | null;
};

const initialError = "Failed to save bill.";

function fail(error: string): BillActionState {
  return { error };
}

function parsePayload(formData: FormData): BillWriteInput {
  const raw = String(formData.get("payload") ?? "");
  const payload = JSON.parse(raw) as BillWriteInput;

  if (!payload.storeName?.trim()) throw new Error("Store name is required.");
  if (!payload.transactionDateUtc) throw new Error("Transaction date is required.");
  if (!payload.primaryPayerParticipantId) throw new Error("Primary payer is required.");
  if (payload.splitMode !== SPLIT_MODE.equal && payload.splitMode !== SPLIT_MODE.weighted) {
    throw new Error("Unsupported split mode.");
  }

  return {
    storeName: payload.storeName.trim(),
    referenceImageDataUrl: payload.referenceImageDataUrl ?? null,
    transactionDateUtc: payload.transactionDateUtc,
    currencyCode: "MYR",
    splitMode: payload.splitMode,
    primaryPayerParticipantId: payload.primaryPayerParticipantId,
    participantSplits: payload.participantSplits,
    items: payload.items.map((item) => ({
      id: item.id,
      description: item.description.trim(),
      amount: item.amount,
      responsibleParticipantIds: item.responsibleParticipantIds,
    })),
    fees: payload.fees.map((fee) => ({
      name: fee.name.trim(),
      feeType: fee.feeType === FEE_TYPE.percentage ? FEE_TYPE.percentage : FEE_TYPE.fixed,
      value: fee.value,
    })),
    extraContributions: payload.extraContributions,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function createBillAction(
  groupId: string,
  _prevState: BillActionState,
  formData: FormData
): Promise<BillActionState> {
  try {
    await createBill(groupId, parsePayload(formData));
  } catch (error) {
    return fail(getErrorMessage(error, initialError));
  }

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function updateBillAction(
  groupId: string,
  billId: string,
  _prevState: BillActionState,
  formData: FormData
): Promise<BillActionState> {
  try {
    await updateBill(groupId, billId, parsePayload(formData));
  } catch (error) {
    return fail(getErrorMessage(error, initialError));
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/bills/${billId}`);
  redirect(`/groups/${groupId}`);
}

export async function deleteBillAction(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const billId = String(formData.get("billId") ?? "");
  if (!groupId || !billId) return;

  await deleteBill(groupId, billId);
  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}
