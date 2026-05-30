"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthCallbackUrl } from "@/lib/auth/site-url";

export type ResendVerificationState = {
  error: string | null;
  success: string | null;
};

export async function resendVerification(
  _prevState: ResendVerificationState,
  formData: FormData
): Promise<ResendVerificationState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { error: "Email is required.", success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: await getAuthCallbackUrl("signup"),
    },
  });

  if (error) {
    return { error: error.message, success: null };
  }

  return { error: null, success: "Verification email sent." };
}
