import { redirect } from "next/navigation";

import { getAppUser, requireUser } from "@/lib/auth/server";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const [user, appUser] = await Promise.all([requireUser(), getAppUser()]);

  if (!appUser) redirect("/sign-in");

  return (
    <SettingsClient
      accountName={appUser.default_payment_account_name ?? ""}
      accountNumber={appUser.default_payment_account_number ?? ""}
      email={user.email ?? appUser.email}
      isEmailVerified={Boolean(user.email_confirmed_at)}
      name={appUser.name}
      notes={appUser.default_payment_notes ?? ""}
      payeeName={appUser.default_payment_payee_name ?? ""}
      paymentMethod={appUser.default_payment_method ?? ""}
      paymentQrDataUrl={appUser.default_payment_qr_data_url ?? ""}
      username={appUser.username ?? ""}
    />
  );
}
