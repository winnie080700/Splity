"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { en, type MessageKey } from "@/lib/i18n/messages/en";
import { zh } from "@/lib/i18n/messages/zh";
import {
  sendAllPaymentsReceivedEmail,
  sendPaymentMarkedEmail,
  sendPaymentReceivedEmail,
} from "@/lib/services/email";
import { recordPublicShareTransferAction } from "@/lib/services/settlement-shares";
import { formDataObject } from "@/lib/validation/form-data";

export type PublicShareActionState = {
  error: string | null;
  success: string | null;
};

const publicShareActionSchema = z.object({
  action: z.enum(["mark_paid", "mark_received"]),
  amount: z.coerce.string().min(1),
  fromParticipantId: z.uuid(),
  proofScreenshotDataUrl: z.coerce.string().optional(),
  toParticipantId: z.uuid(),
  token: z.coerce.string().min(1),
  transferKey: z.coerce.string().min(1),
});

async function serverT(key: MessageKey) {
  const locale = (await cookies()).get("splity.locale")?.value;
  return locale === "zh" ? (zh[key] ?? en[key]) : en[key];
}

function normalizeProof(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (!/^data:image\/(png|jpeg|webp);base64,/i.test(trimmed)) {
    throw new Error("settlements.proofTypeError");
  }

  if (trimmed.length > 5 * 1024 * 1024 * 1.4) {
    throw new Error("settlements.proofSizeError");
  }

  return trimmed;
}

function fail(error: string): PublicShareActionState {
  return { error, success: null };
}

function ok(success: string): PublicShareActionState {
  return { error: null, success };
}

export async function confirmPublicShareTransferAction(
  _prevState: PublicShareActionState,
  formData: FormData
): Promise<PublicShareActionState> {
  const result = publicShareActionSchema.safeParse(
    formDataObject(formData, [
      "action",
      "amount",
      "fromParticipantId",
      "proofScreenshotDataUrl",
      "toParticipantId",
      "token",
      "transferKey",
    ])
  );

  if (!result.success) {
    return fail(await serverT("share.confirmFailed"));
  }

  try {
    const notification = await recordPublicShareTransferAction({
      ...result.data,
      proofScreenshotDataUrl: normalizeProof(result.data.proofScreenshotDataUrl),
    });
    if (notification.changed) {
      await Promise.all([
        result.data.action === "mark_paid" && notification.toUserId
          ? sendPaymentMarkedEmail({
              actorName: notification.actorName,
              amount: result.data.amount,
              groupName: notification.groupName,
              receiverUserId: notification.toUserId,
              shareToken: result.data.token,
            })
          : Promise.resolve(),
        result.data.action === "mark_received" && notification.fromUserId
          ? sendPaymentReceivedEmail({
              actorName: notification.actorName,
              amount: result.data.amount,
              groupName: notification.groupName,
              payerUserId: notification.fromUserId,
              shareToken: result.data.token,
            })
          : Promise.resolve(),
        notification.allReceived && notification.organizerUserId
          ? sendAllPaymentsReceivedEmail({
              groupId: notification.groupId,
              groupName: notification.groupName,
              organizerUserId: notification.organizerUserId,
            })
          : Promise.resolve(),
      ]);
    }
    revalidatePath(`/share/${result.data.token}`);
    return ok(
      await serverT(
        result.data.action === "mark_paid"
          ? "share.actionMarkedPaid"
          : "share.actionMarkedReceived"
      )
    );
  } catch (error) {
    return fail(await getErrorMessage(error, "share.confirmFailed"));
  }
}

async function getErrorMessage(error: unknown, fallbackKey: MessageKey) {
  if (error instanceof Error && error.message in en) {
    return serverT(error.message as MessageKey);
  }

  return serverT(fallbackKey);
}
