"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type SignUpState = {
  error: string | null;
};

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function normalizeUsername(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
}

function isDuplicateIdentityError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("database error") ||
    normalized.includes("already registered") ||
    normalized.includes("already taken") ||
    normalized.includes("duplicate")
  );
}

export async function signUp(
  _prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const name = String(formData.get("name") ?? "").trim();
  const username = normalizeUsername(formData.get("username"));
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !username || !email || !password) {
    return { error: "All fields are required." };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      error:
        "Username must be 3-30 characters and use only letters, numbers, dot, underscore, or dash.",
    };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, username },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?type=signup`,
    },
  });

  if (error) {
    if (isDuplicateIdentityError(error.message)) {
      return { error: "Email or username already taken." };
    }

    return { error: error.message };
  }

  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}
