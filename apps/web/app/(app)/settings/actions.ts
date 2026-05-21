"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type SettingsActionState = {
  error: string | null;
  success: string | null;
};

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
const QR_DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,/;
const MAX_QR_DATA_URL_LENGTH = 7_200_000;

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableValue(formData: FormData, name: string) {
  const next = value(formData, name);
  return next.length ? next : null;
}

function normalizeUsername(input: string) {
  return input.replace(/^@+/, "").trim().toLowerCase();
}

function isDuplicateUsernameError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function updateProfileAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const name = value(formData, "name");
  const username = normalizeUsername(value(formData, "username"));

  if (name.length < 1 || name.length > 150) {
    return { error: "Display name must be 1-150 characters.", success: null };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      error:
        "Username must be 3-30 characters and use only letters, numbers, dot, underscore, or dash.",
      success: null,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Not authenticated.", success: null };
    }

    const { error } = await supabase
      .from("app_users")
      .update({ name, username })
      .eq("id", user.id);

    if (error) {
      if (isDuplicateUsernameError(error)) {
        return { error: "Username already taken.", success: null };
      }

      throw error;
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { error: null, success: "Profile saved." };
  } catch (error) {
    return { error: getErrorMessage(error, "Failed to save profile."), success: null };
  }
}

export async function updatePaymentProfileAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const payeeName = nullableValue(formData, "payeeName");
  const paymentMethod = nullableValue(formData, "paymentMethod");
  const accountName = nullableValue(formData, "accountName");
  const accountNumber = nullableValue(formData, "accountNumber");
  const notes = nullableValue(formData, "notes");
  const paymentQrDataUrl = nullableValue(formData, "paymentQrDataUrl");

  if (payeeName && payeeName.length > 150) {
    return { error: "Payee name must be 150 characters or fewer.", success: null };
  }

  if (paymentMethod && paymentMethod.length > 120) {
    return { error: "Payment method must be 120 characters or fewer.", success: null };
  }

  if (accountName && accountName.length > 150) {
    return { error: "Account name must be 150 characters or fewer.", success: null };
  }

  if (accountNumber && accountNumber.length > 120) {
    return { error: "Account number must be 120 characters or fewer.", success: null };
  }

  if (notes && notes.length > 2000) {
    return { error: "Notes must be 2000 characters or fewer.", success: null };
  }

  if (paymentQrDataUrl) {
    if (
      paymentQrDataUrl.length > MAX_QR_DATA_URL_LENGTH ||
      !QR_DATA_URL_PATTERN.test(paymentQrDataUrl)
    ) {
      return {
        error: "QR code must be a PNG, JPEG, or WebP image no larger than 5MB.",
        success: null,
      };
    }
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Not authenticated.", success: null };
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
    return { error: null, success: "Payment profile saved." };
  } catch (error) {
    return {
      error: getErrorMessage(error, "Failed to save payment profile."),
      success: null,
    };
  }
}

export async function changePasswordAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmNewPassword = String(formData.get("confirmNewPassword") ?? "");

  if (!currentPassword) {
    return { error: "Current password is required.", success: null };
  }

  if (newPassword.length < 6) {
    return { error: "Password must be at least 6 characters.", success: null };
  }

  if (newPassword !== confirmNewPassword) {
    return { error: "Passwords do not match.", success: null };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return { error: "Not authenticated.", success: null };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return { error: "Current password is incorrect.", success: null };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    return { error: null, success: "Password updated." };
  } catch (error) {
    return { error: getErrorMessage(error, "Failed to update password."), success: null };
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
      return { error: "Not authenticated.", success: null };
    }

    if (user.email_confirmed_at) {
      return { error: null, success: "Email is already verified." };
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/callback?type=signup`,
      },
    });

    if (error) throw error;

    return { error: null, success: "Verification email sent." };
  } catch (error) {
    return {
      error: getErrorMessage(error, "Failed to send verification email."),
      success: null,
    };
  }
}
