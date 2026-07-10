import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AppUser = Database["public"]["Tables"]["app_users"]["Row"];

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function getAppUser(): Promise<AppUser | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data;
}
