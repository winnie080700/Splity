import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/sign-in",
  "/reset-password",
  "/verify-email",
];
const APP_PATHS_REGEX =
  /^\/(groups|bills|settlements|invitations|settings)(?:\/|$)/;

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
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
    return NextResponse.redirect(new URL("/groups", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets, image optimizer, favicon.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
