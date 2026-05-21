import Link from "next/link";

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
          Back to groups
        </Link>
      </div>

      <header className="border-b border-zinc-200 pb-5">
        <h1 className="text-3xl font-semibold tracking-tight">Pending invitations</h1>
        <p className="mt-2 text-sm text-zinc-500">Accept or decline group invitations tied to your account.</p>
      </header>

      {invitations.length === 0 ? (
        <EmptyState description="Accepted groups appear on your dashboard." title="No pending invitations" />
      ) : (
        <section className="grid gap-3">
          {invitations.map((invitation) => (
            <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm" key={invitation.participantId}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-950">{invitation.groupName}</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Invited by {invitation.invitedByName} on{" "}
                    {new Date(invitation.createdAtUtc).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={declineInvitationAction}>
                    <input name="participantId" type="hidden" value={invitation.participantId} />
                    <Button type="submit" variant="secondary">
                      Decline
                    </Button>
                  </form>
                  <form action={acceptInvitationAction}>
                    <input name="participantId" type="hidden" value={invitation.participantId} />
                    <Button type="submit">Accept</Button>
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
