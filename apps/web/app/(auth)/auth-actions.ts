"use server";

import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error: string | null;
  success: string | null;
  redirectTo: string | null;
};

export type PasswordActionState = {
  error: string | null;
  success: string | null;
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

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Email and password are required.",
      success: null,
      redirectTo: null,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message, success: null, redirectTo: null };
  }

  return {
    error: null,
    success: "Login success, redirecting to dashboard...",
    redirectTo: "/dashboard",
  };
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const username = normalizeUsername(formData.get("username"));
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !username || !email || !password) {
    return { error: "All fields are required.", success: null, redirectTo: null };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      error:
        "Username must be 3-30 characters and use only letters, numbers, dot, underscore, or dash.",
      success: null,
      redirectTo: null,
    };
  }

  if (password.length < 6) {
    return {
      error: "Password must be at least 6 characters.",
      success: null,
      redirectTo: null,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, username },
      emailRedirectTo: `${getSiteUrl()}/auth/callback/signup`,
    },
  });

  if (error) {
    if (isDuplicateIdentityError(error.message)) {
      return {
        error: "Email or username already taken.",
        success: null,
        redirectTo: null,
      };
    }

    return { error: error.message, success: null, redirectTo: null };
  }

  return {
    error: null,
    success: "Register success, redirecting to dashboard...",
    redirectTo: "/dashboard",
  };
}

export async function requestPasswordReset(
  _prevState: PasswordActionState,
  formData: FormData
): Promise<PasswordActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { error: "Email is required.", success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback/recovery`,
  });

  if (error) {
    return { error: error.message, success: null };
  }

  return {
    error: null,
    success: "If that account exists, a reset link has been sent.",
  };
}

export async function resetPassword(
  _prevState: PasswordActionState,
  formData: FormData
): Promise<PasswordActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || !confirmPassword) {
    return { error: "Both password fields are required.", success: null };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters.", success: null };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message, success: null };
  }

  await supabase.auth.signOut();
  return {
    error: null,
    success: "Update success, redirecting to login page...",
  };
}
