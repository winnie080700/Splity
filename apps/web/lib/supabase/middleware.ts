import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv, hasSupabasePublicEnv } from "@/lib/supabase/env";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function updateSession(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const { supabaseUrl, supabasePublicKey } = getSupabasePublicEnv();

  const supabase = createServerClient(supabaseUrl, supabasePublicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as CookieOptions)
        );
      },
    },
  });

  // Refresh session if needed; do not remove this call.
  await supabase.auth.getUser();

  return response;
}
