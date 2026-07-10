"use server";

import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";

import { serverErrorMessage, serverT } from "@/lib/i18n/server";
import {
  getSettlement,
  markSettlementPaid,
  markSettlementReceived,
  type SettlementActionInput,
} from "@/lib/services/settlements";
import { formDataObject } from "@/lib/validation/form-data";
import { zodErrorMessage } from "@/lib/validation/zod";
import { getGroup } from "@/lib/services/groups";
import { listParticipants } from "@/lib/services/participants";
import {
  sendAllPaymentsReceivedEmail,
  sendPaymentMarkedEmail,
  sendPaymentReceivedEmail,
} from "@/lib/services/email";
import { getActiveShare } from "@/lib/services/settlement-shares";
import { SETTLEMENT_TRANSFER_STATUS } from "@/lib/domain/status";
import { areAllStatusesReceived } from "@/lib/domain/settlement-notifications";

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
    const result = await markSettlementPaid(groupId, input);
    const [group, participants, activeShare] = await Promise.all([
      getGroup(groupId),
      listParticipants(groupId),
      getActiveShare(groupId),
    ]);
    const receiver = participants.find((participant) => participant.id === input.toParticipantId);
    const actor = participants.find((participant) => participant.id === input.actorParticipantId);
    if (
      result.previousStatus !== SETTLEMENT_TRANSFER_STATUS.markedPaid &&
      group &&
      activeShare &&
      receiver?.invited_user_id
    ) {
      await sendPaymentMarkedEmail({
        actorName: actor?.name ?? group.name,
        amount: input.amount,
        groupName: group.name,
        receiverUserId: receiver.invited_user_id,
        shareToken: activeShare.shareToken,
      });
    }
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
    const result = await markSettlementReceived(groupId, input);
    if (result.previousStatus !== SETTLEMENT_TRANSFER_STATUS.received) {
      const [group, participants, activeShare, settlement] = await Promise.all([
        getGroup(groupId),
        listParticipants(groupId),
        getActiveShare(groupId),
        getSettlement(groupId, input.fromDateUtc, input.toDateUtc),
      ]);
      const payer = participants.find((participant) => participant.id === input.fromParticipantId);
      const actor = participants.find((participant) => participant.id === input.actorParticipantId);
      await Promise.all([
        group && activeShare && payer?.invited_user_id
          ? sendPaymentReceivedEmail({
              actorName: actor?.name ?? group.name,
              amount: input.amount,
              groupName: group.name,
              payerUserId: payer.invited_user_id,
              shareToken: activeShare.shareToken,
            })
          : Promise.resolve(),
        group?.created_by_user_id &&
        areAllStatusesReceived(settlement.transfers.map((transfer) => transfer.status))
          ? sendAllPaymentsReceivedEmail({
              groupId,
              groupName: group.name,
              organizerUserId: group.created_by_user_id,
            })
          : Promise.resolve(),
      ]);
    }
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
