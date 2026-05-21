import { updateSession } from "@/lib/supabase/middleware";
import { getSupabasePublicEnv, hasSupabasePublicEnv } from "@/lib/supabase/env";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];
const APP_PATHS_REGEX =
  /^\/(dashboard|groups|bills|settlements|invitations|settings)(?:\/|$)/;

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  if (!hasSupabasePublicEnv()) {
    return response;
  }

  const { supabaseUrl, supabasePublicKey } = getSupabasePublicEnv();
  const supabase = createServerClient(supabaseUrl, supabasePublicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;

  if (!user && APP_PATHS_REGEX.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("redirectTo", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (
    user &&
    PUBLIC_PATHS.some(
      (path) =>
        pathname.startsWith(path) &&
        path !== "/verify-email" &&
        path !== "/reset-password"
    )
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets, image optimizer, favicon.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
