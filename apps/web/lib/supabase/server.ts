import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicEnv } from "@/lib/supabase/env";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

/**
 * Server-side Supabase client with the current user's JWT from cookies.
 * RLS policies are enforced; this is the default client for Server Components
 * and Route Handlers handling logged-in users.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabasePublicKey } = getSupabasePublicEnv();

  return createServerClient(supabaseUrl, supabasePublicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as CookieOptions)
          );
        } catch {
          // Server Component context cannot set cookies; middleware handles it.
        }
      },
    },
  });
}
