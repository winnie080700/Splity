"use server";

import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = {
  error: string | null;
  success: string | null;
};

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { error: "Email is required.", success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?type=recovery`,
  });

  if (error) {
    return { error: error.message, success: null };
  }

  return {
    error: null,
    success: "If that account exists, a reset link has been sent.",
  };
}
