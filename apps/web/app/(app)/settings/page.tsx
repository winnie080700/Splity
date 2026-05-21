import { redirect } from "next/navigation";

import { getAppUser, requireUser } from "@/lib/auth/server";
import { ChangePasswordForm } from "./change-password-form";
import { EmailSection } from "./email-section";
import { PaymentProfileForm } from "./payment-profile-form";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const [user, appUser] = await Promise.all([requireUser(), getAppUser()]);

  if (!appUser) redirect("/sign-in");

  return (
    <div className="grid gap-6">
      <header className="border-b border-zinc-200 pb-5">
        <p className="text-sm font-semibold text-zinc-500">
          {appUser.username ? `@${appUser.username}` : user.email}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Manage your profile, payment defaults, password, and email verification.
        </p>
      </header>

      <ProfileForm name={appUser.name} username={appUser.username ?? ""} />
      <PaymentProfileForm
        accountName={appUser.default_payment_account_name ?? ""}
        accountNumber={appUser.default_payment_account_number ?? ""}
        notes={appUser.default_payment_notes ?? ""}
        payeeName={appUser.default_payment_payee_name ?? ""}
        paymentMethod={appUser.default_payment_method ?? ""}
        paymentQrDataUrl={appUser.default_payment_qr_data_url ?? ""}
      />
      <ChangePasswordForm />
      <EmailSection email={user.email ?? appUser.email} isVerified={Boolean(user.email_confirmed_at)} />
    </div>
  );
}
