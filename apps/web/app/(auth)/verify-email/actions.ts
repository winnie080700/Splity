"use server";

import { createClient } from "@/lib/supabase/server";

export type ResendVerificationState = {
  error: string | null;
  success: string | null;
};

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

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
      emailRedirectTo: `${getSiteUrl()}/auth/callback/signup`,
    },
  });

  if (error) {
    return { error: error.message, success: null };
  }

  return { error: null, success: "Verification email sent." };
}
