import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { signOut } from "@/lib/auth/actions";
import { getAppUser, requireUser } from "@/lib/auth/server";
import {
  GROUP_STATUS_LABELS,
  isGroupStatus,
  listAccessibleGroups,
} from "@/lib/services/groups";
import { listMyInvitations } from "@/lib/services/invitations";
import { NewGroupForm } from "./new-group-form";

export default async function DashboardPage() {
  const user = await requireUser();
  const [appUser, groups, invitations] = await Promise.all([
    getAppUser(),
    listAccessibleGroups(),
    listMyInvitations().catch(() => []),
  ]);

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <p className="text-sm font-semibold text-zinc-500">
            {appUser?.username ? `@${appUser.username}` : user.email}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Groups
          </h1>
        </div>
        <form action={signOut}>
          <button
            className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </header>

      <NewGroupForm />

      {invitations.length ? (
        <Link
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
          href="/invitations"
        >
          You have {invitations.length} pending invitation{invitations.length === 1 ? "" : "s"}.
        </Link>
      ) : null}

      {groups.length === 0 ? (
        <EmptyState
          description="Create a group before adding participants and bills."
          title="No groups yet"
        />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => {
            const status = isGroupStatus(group.status) ? group.status : 0;

            return (
              <Link
                className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow"
                href={`/groups/${group.id}`}
                key={group.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-950">
                      {group.name}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      Created {new Date(group.created_at_utc).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge tone={status === 0 ? "green" : status === 1 ? "amber" : "blue"}>
                    {GROUP_STATUS_LABELS[status]}
                  </Badge>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
