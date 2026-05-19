// =============================================================
// SERVICE-ROLE BYPASS - DO NOT IMPORT WITHOUT JUSTIFICATION.
//
// This client uses the Supabase service_role key, which BYPASSES
// Row-Level Security on every table.
//
// Allowed usage (per migration-prd.md §2.1):
//   1. Auth trigger / system-level mirror writes (e.g. handle_new_user).
//   2. One-off maintenance scripts (clearly marked & reviewed).
//   3. Webhooks invoked by trusted external services (none yet).
//
// Every call site MUST be tagged with `// SERVICE-ROLE: <reason>`
// and reviewed against the §2.1 allow-list.
// =============================================================

import { createClient as createSupabase } from "@supabase/supabase-js";

import {
  getSupabasePublicEnv,
  getSupabaseServiceRoleKey,
} from "@/lib/supabase/env";

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("admin client must never run in the browser");
  }

  const { supabaseUrl } = getSupabasePublicEnv();

  return createSupabase(supabaseUrl, getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
