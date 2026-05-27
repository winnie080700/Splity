import { ZodError } from "zod";

import type { MessageKey } from "@/lib/i18n";
import { en } from "@/lib/i18n/messages/en";
import { serverT } from "@/lib/i18n/server";

export async function zodErrorMessage(error: ZodError, fallbackKey: MessageKey) {
  const firstMessage = error.issues[0]?.message;

  if (firstMessage && firstMessage in en) {
    return serverT(firstMessage as MessageKey);
  }

  return serverT(fallbackKey);
}
