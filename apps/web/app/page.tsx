import { hasSupabasePublicEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function isMissingSessionError(error: { message?: string; name?: string } | null) {
  return (
    error?.name === "AuthSessionMissingError" ||
    error?.message === "Auth session missing!"
  );
}

export default async function Page() {
  let result: { user: unknown; error: string | null };

  if (hasSupabasePublicEnv()) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    result = {
      user: data?.user ?? null,
      error: isMissingSessionError(error) ? null : error?.message ?? null,
    };
  } else {
    result = {
      user: null,
      error:
        "Missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    };
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-8 font-mono text-sm text-zinc-950">
      <h1 className="mb-4 text-xl font-semibold">
        Splity Web - Phase 1 smoke test
      </h1>
      <pre className="overflow-x-auto rounded bg-white p-4 shadow-sm ring-1 ring-zinc-200">
        {JSON.stringify(result, null, 2)}
      </pre>
      <p className="mt-4 text-zinc-600">
        Expected after .env.local is configured and before sign-up flow exists:{" "}
        {`user: null`}, no error.
      </p>
    </main>
  );
}
