import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export function createAnonServerClient() {
  const { supabaseUrl, supabasePublicKey } = getSupabasePublicEnv();

  return createSupabaseClient<Database>(supabaseUrl, supabasePublicKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
