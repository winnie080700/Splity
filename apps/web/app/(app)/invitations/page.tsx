import Link from "next/link";

import { T } from "@/components/i18n/t";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listMyInvitations, type Invitation } from "@/lib/services/invitations";
import { acceptInvitationAction, declineInvitationAction } from "./actions";

export default async function InvitationsPage() {
  let invitations: Invitation[] = [];

  try {
    invitations = await listMyInvitations();
  } catch {
    invitations = [];
  }

  return (
    <div className="grid gap-6">
      <div>
        <Link className="text-sm font-semibold text-zinc-600 underline" href="/dashboard">
          <T k="common.backToGroups" />
        </Link>
      </div>

      <header className="border-b border-zinc-200 pb-5">
        <h1 className="text-3xl font-semibold tracking-tight">
          <T k="invitations.title" />
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          <T k="invitations.body" />
        </p>
      </header>

      {invitations.length === 0 ? (
        <EmptyState description={<T k="invitations.emptyBody" />} title={<T k="invitations.emptyTitle" />} />
      ) : (
        <section className="grid gap-3">
          {invitations.map((invitation) => (
            <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm" key={invitation.participantId}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-950">{invitation.groupName}</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    <T
                      k="invitations.invitedBy"
                      values={{
                        date: new Date(invitation.createdAtUtc).toLocaleDateString(),
                        name: invitation.invitedByName,
                      }}
                    />
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={declineInvitationAction}>
                    <input name="participantId" type="hidden" value={invitation.participantId} />
                    <Button type="submit" variant="secondary">
                      <T k="invitations.decline" />
                    </Button>
                  </form>
                  <form action={acceptInvitationAction}>
                    <input name="participantId" type="hidden" value={invitation.participantId} />
                    <Button type="submit">
                      <T k="invitations.accept" />
                    </Button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
