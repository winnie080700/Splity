import { createClient } from "@/lib/supabase/server";

export type UserLookupDto = {
  id: string;
  name: string;
  username: string;
};

export function normalizeUsername(username: string | null | undefined) {
  const normalized = String(username ?? "")
    .trim()
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();

  return normalized || null;
}

export async function searchUserByUsername(
  username: string | null | undefined
): Promise<UserLookupDto | null> {
  const normalized = normalizeUsername(username);
  if (!normalized) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_user_by_username", {
    p_username: normalized,
  });

  if (error) throw error;
  return data[0] ?? null;
}
