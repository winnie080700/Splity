import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/groups";
  }

  return value;
}

export async function handleAuthCallback(
  request: NextRequest,
  callbackType?: string,
) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const type = callbackType ?? searchParams.get("type");
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=missing_code", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL("/sign-in", origin);
    url.searchParams.set("error", error.message);
    return NextResponse.redirect(url);
  }

  if (type === "recovery") {
    return NextResponse.redirect(new URL("/reset-password", origin));
  }

  return NextResponse.redirect(new URL(redirectTo, origin));
}
