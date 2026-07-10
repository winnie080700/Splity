"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { en, type MessageKey } from "@/lib/i18n/messages/en";
import { zh } from "@/lib/i18n/messages/zh";
import { getAuthCallbackUrl } from "@/lib/auth/site-url";
import { createClient } from "@/lib/supabase/server";
import { formDataObject } from "@/lib/validation/form-data";
import { zodErrorMessage } from "@/lib/validation/zod";

export type SettingsActionState = {
  error: string | null;
  success: string | null;
};

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
const QR_DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,/;
const MAX_QR_DATA_URL_LENGTH = 7_200_000;

function normalizeUsername(input: string) {
  return input.replace(/^@+/, "").trim().toLowerCase();
}

const nullableTrimmedString = (maxLength: number, message: MessageKey) =>
  z.coerce
    .string()
    .trim()
    .transform((value) => (value.length ? value : null))
    .refine((value) => value === null || value.length <= maxLength, { message });

const profileSchema = z.object({
  name: z.coerce
    .string()
    .trim()
    .min(1, "settings.errorDisplayNameLength")
    .max(150, "settings.errorDisplayNameLength"),
  username: z.coerce
    .string()
    .transform(normalizeUsername)
    .refine((value) => USERNAME_PATTERN.test(value), {
      message: "settings.errorUsernameInvalid",
    }),
});

const paymentProfileSchema = z.object({
  payeeName: nullableTrimmedString(150, "settings.errorPayeeLength"),
  paymentMethod: nullableTrimmedString(120, "settings.errorPaymentMethodLength"),
  accountName: nullableTrimmedString(150, "settings.errorAccountNameLength"),
  accountNumber: nullableTrimmedString(120, "settings.errorAccountNumberLength"),
  notes: nullableTrimmedString(2000, "settings.errorNotesLength"),
  paymentQrDataUrl: nullableTrimmedString(MAX_QR_DATA_URL_LENGTH, "settings.errorQrInvalid").refine(
    (value) => value === null || QR_DATA_URL_PATTERN.test(value),
    { message: "settings.errorQrInvalid" }
  ),
});

const passwordSchema = z
  .object({
    currentPassword: z.coerce.string().min(1, "settings.errorCurrentPasswordRequired"),
    newPassword: z.coerce.string().min(6, "settings.errorPasswordMin"),
    confirmNewPassword: z.coerce.string(),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "settings.errorPasswordsMismatch",
    path: ["confirmNewPassword"],
  });

function isDuplicateUsernameError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

async function serverT(key: MessageKey) {
  const locale = (await cookies()).get("splity.locale")?.value;

  if (locale === "zh") {
    return zh[key] ?? en[key];
  }

  return en[key];
}

async function getErrorMessage(error: unknown, fallbackKey: MessageKey) {
  return error instanceof Error ? error.message : serverT(fallbackKey);
}

export async function updateProfileAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const result = profileSchema.safeParse(formDataObject(formData, ["name", "username"]));
  if (!result.success) {
    return { error: await zodErrorMessage(result.error, "settings.profileSaveFailed"), success: null };
  }

  try {
    const { name, username } = result.data;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: await serverT("settings.errorNotAuthenticated"), success: null };
    }

    const { error } = await supabase
      .from("app_users")
      .update({ name, username })
      .eq("id", user.id);

    if (error) {
      if (isDuplicateUsernameError(error)) {
        return { error: await serverT("settings.errorUsernameTaken"), success: null };
      }

      throw error;
    }

    revalidatePath("/settings");
    revalidatePath("/groups");
    return { error: null, success: await serverT("settings.profileSaved") };
  } catch (error) {
    return { error: await getErrorMessage(error, "settings.profileSaveFailed"), success: null };
  }
}

export async function updatePaymentProfileAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const result = paymentProfileSchema.safeParse(
    formDataObject(formData, [
      "payeeName",
      "paymentMethod",
      "accountName",
      "accountNumber",
      "notes",
      "paymentQrDataUrl",
    ])
  );
  if (!result.success) {
    return { error: await zodErrorMessage(result.error, "settings.paymentSaveFailed"), success: null };
  }

  try {
    const { accountName, accountNumber, notes, payeeName, paymentMethod, paymentQrDataUrl } = result.data;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: await serverT("settings.errorNotAuthenticated"), success: null };
    }

    const { error } = await supabase
      .from("app_users")
      .update({
        default_payment_payee_name: payeeName,
        default_payment_method: paymentMethod,
        default_payment_account_name: accountName,
        default_payment_account_number: accountNumber,
        default_payment_notes: notes,
        default_payment_qr_data_url: paymentQrDataUrl,
      })
      .eq("id", user.id);

    if (error) throw error;

    revalidatePath("/settings");
    return { error: null, success: await serverT("settings.paymentSaved") };
  } catch (error) {
    return {
      error: await getErrorMessage(error, "settings.paymentSaveFailed"),
      success: null,
    };
  }
}

export async function changePasswordAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const result = passwordSchema.safeParse(
    formDataObject(formData, ["currentPassword", "newPassword", "confirmNewPassword"])
  );
  if (!result.success) {
    return { error: await zodErrorMessage(result.error, "settings.passwordUpdateFailed"), success: null };
  }

  try {
    const { currentPassword, newPassword } = result.data;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return { error: await serverT("settings.errorNotAuthenticated"), success: null };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return { error: await serverT("settings.errorCurrentPasswordIncorrect"), success: null };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    return { error: null, success: await serverT("settings.passwordUpdated") };
  } catch (error) {
    return { error: await getErrorMessage(error, "settings.passwordUpdateFailed"), success: null };
  }
}

export async function resendVerificationAction(
  _prevState: SettingsActionState,
  _formData: FormData
): Promise<SettingsActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return { error: await serverT("settings.errorNotAuthenticated"), success: null };
    }

    if (user.email_confirmed_at) {
      return { error: null, success: await serverT("settings.emailAlreadyVerified") };
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: {
        emailRedirectTo: await getAuthCallbackUrl("signup"),
      },
    });

    if (error) throw error;

    return { error: null, success: await serverT("settings.verificationSent") };
  } catch (error) {
    return {
      error: await getErrorMessage(error, "settings.verificationSendFailed"),
      success: null,
    };
  }
}
