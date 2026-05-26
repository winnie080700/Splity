import { createClient } from "@/lib/supabase/server";

export type UserLookupDto = {
  id: string;
  name: string;
  username: string;
};

export type UserPaymentProfile = {
  accountName: string | null;
  accountNumber: string | null;
  notes: string | null;
  payeeName: string | null;
  paymentMethod: string | null;
  paymentQrDataUrl: string | null;
  userId: string;
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

export async function listUserPaymentProfiles(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return new Map<string, UserPaymentProfile>();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_users")
    .select(
      "id, default_payment_payee_name, default_payment_method, default_payment_account_name, default_payment_account_number, default_payment_notes, default_payment_qr_data_url"
    )
    .in("id", ids);

  if (error) throw error;

  return new Map(
    data.map((row) => [
      row.id,
      {
        accountName: row.default_payment_account_name,
        accountNumber: row.default_payment_account_number,
        notes: row.default_payment_notes,
        payeeName: row.default_payment_payee_name,
        paymentMethod: row.default_payment_method,
        paymentQrDataUrl: row.default_payment_qr_data_url,
        userId: row.id,
      },
    ])
  );
}
