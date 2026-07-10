import { AppShell } from "@/components/app/app-shell";
import { getAppUser, requireUser } from "@/lib/auth/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, appUser] = await Promise.all([
    requireUser(),
    getAppUser(),
  ]);

  const userName = appUser?.name || appUser?.username || user.email || "Splity";

  return (
    <AppShell
      userEmail={user.email ?? appUser?.email ?? ""}
      userName={userName}
    >
      {children}
    </AppShell>
  );
}
