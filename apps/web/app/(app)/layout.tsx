import { AppShell } from "@/components/app/app-shell";
import { getAppUser, requireUser } from "@/lib/auth/server";
import { listAccessibleGroups } from "@/lib/services/groups";
import { listMyInvitations } from "@/lib/services/invitations";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, appUser, groups, invitations] = await Promise.all([
    requireUser(),
    getAppUser(),
    listAccessibleGroups(),
    listMyInvitations().catch(() => []),
  ]);

  const userName = appUser?.name || appUser?.username || user.email || "Splity";

  return (
    <AppShell
      groupCount={groups.length}
      invitationCount={invitations.length}
      userEmail={user.email ?? appUser?.email ?? ""}
      userName={userName}
    >
      {children}
    </AppShell>
  );
}
