import { Clock3, Inbox, Mail, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { T } from "@/components/i18n/t";
import { listMyInvitations, type Invitation } from "@/lib/services/invitations";
import { InvitationActionForms } from "./invitations-client-controls";

const avatarColors = ["#c46920", "#2e8a5e", "#6b3ce7", "#1b2a6b", "#c24a4a"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  })
    .format(new Date(value))
    .toUpperCase();
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S"
  );
}

export default async function InvitationsPage() {
  let invitations: Invitation[] = [];

  try {
    invitations = await listMyInvitations();
  } catch {
    invitations = [];
  }

  const latestInvite = invitations[0];

  return (
    <div className="mx-auto grid w-full max-w-[1640px] gap-5 sm:gap-7">
      <header>
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--splity-gold-strong)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--splity-gold-strong)]" />
          <T k="invitations.eyebrow" />
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--splity-ink)] sm:mt-5 sm:text-6xl">
          <T k="invitations.heading" />{" "}
          <span className="font-normal italic text-[var(--splity-navy)]">
            <T k="invitations.headingAccent" />
          </span>{" "}
          <span className="font-normal italic text-[var(--splity-navy)]">· {invitations.length}</span>
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[var(--splity-muted)]">
          <T k="invitations.body" />
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--splity-line)] bg-white p-3 shadow-[0_2px_8px_rgba(12,21,56,0.06)] sm:rounded-3xl sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <StatusPill active count={invitations.length} icon={<Inbox className="h-3.5 w-3.5" />}>
              <T k="invitations.received" />
            </StatusPill>
            <StatusPill count={0} icon={<Mail className="h-3.5 w-3.5" />}>
              <T k="invitations.sent" />
            </StatusPill>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--splity-muted)]">
            <span>
              <T k="invitations.pendingCount" values={{ count: invitations.length }} />
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-[var(--splity-line-strong)] sm:block" />
            <span>
              {latestInvite ? (
                <T k="invitations.latest" values={{ date: formatDate(latestInvite.createdAtUtc) }} />
              ) : (
                <T k="invitations.latestEmpty" />
              )}
            </span>
          </div>
        </div>
      </section>

      {invitations.length === 0 ? (
        <EmptyInvitations />
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {invitations.map((invitation, index) => (
            <InvitationCard
              invitation={invitation}
              key={invitation.participantId}
              tone={avatarColors[index % avatarColors.length]}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatusPill({
  active,
  children,
  count,
  icon,
}: {
  active?: boolean;
  children: ReactNode;
  count: number;
  icon: ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-bold sm:rounded-xl sm:px-4",
        active
          ? "border-[var(--splity-navy)] bg-[var(--splity-navy)] text-white shadow-[0_10px_22px_rgba(27,42,107,0.18)]"
          : "border-[var(--splity-line)] bg-white text-[var(--splity-ink)]",
      ].join(" ")}
    >
      <span className={active ? "text-[var(--splity-gold)]" : "text-[var(--splity-muted)]"}>{icon}</span>
      <span>{children}</span>
      <span className={active ? "text-white/80" : "text-[var(--splity-muted)]"}>{count}</span>
    </span>
  );
}

function InvitationCard({ invitation, tone }: { invitation: Invitation; tone: string }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-[var(--splity-line)] bg-white p-4 shadow-sm transition sm:rounded-3xl sm:p-6 sm:hover:-translate-y-0.5 sm:hover:shadow-[0_18px_40px_rgba(12,21,56,0.08)]">
      <span className="absolute inset-y-5 right-0 w-1 rounded-l-full bg-[var(--splity-gold-strong)]" />
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="inline-flex h-11 w-11 shrink-0 rotate-[-3deg] items-center justify-center rounded-[14px] splity-display text-base font-extrabold text-white shadow-sm"
            style={{ backgroundColor: tone }}
          >
            {initials(invitation.invitedByName)}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--splity-muted)]">
              <T k="invitations.invitedByLabel" />
            </p>
            <p className="mt-1 truncate text-sm font-bold text-[var(--splity-ink)]">
              {invitation.invitedByName}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--splity-muted)]">
            <T k="invitations.sentOn" />
          </p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--splity-gold-strong)]">
            {formatDate(invitation.createdAtUtc)}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--splity-line)] bg-[color:var(--splity-bg)]/35 p-5">
        <h2 className="truncate text-xl font-bold tracking-tight text-[var(--splity-ink)] sm:text-2xl">
          {invitation.groupName}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--splity-muted)]">
          <T k="invitations.cardBody" />
        </p>

        <div className="mt-5 grid gap-4 border-t border-dashed border-[var(--splity-line-strong)] pt-4 sm:grid-cols-3">
          <InviteStat
            icon={<Clock3 className="h-4 w-4" />}
            label={<T k="invitations.status" />}
            value={<T k="groups.invitation.pending" />}
          />
          <InviteStat
            icon={<ShieldCheck className="h-4 w-4" />}
            label={<T k="invitations.access" />}
            value={<T k="invitations.memberAccess" />}
          />
          <InviteStat
            icon={<Mail className="h-4 w-4" />}
            label={<T k="invitations.receivedAt" />}
            value={formatDate(invitation.createdAtUtc)}
          />
        </div>
      </div>

      <InvitationActionForms participantId={invitation.participantId} />
    </article>
  );
}

function InviteStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--splity-muted)]">
        <span className="text-[var(--splity-navy)]/60">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 truncate text-sm font-bold text-[var(--splity-ink)]">{value}</div>
    </div>
  );
}

function EmptyInvitations() {
  return (
    <section className="grid min-h-72 place-items-center rounded-3xl border border-dashed border-[var(--splity-line-strong)] bg-white/45 p-10 text-center">
      <div>
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(27,42,107,0.10)] text-[var(--splity-navy)]">
          <Mail className="h-6 w-6" />
        </span>
        <h2 className="mt-5 text-2xl font-bold text-[var(--splity-ink)]">
          <T k="invitations.emptyTitle" />
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--splity-muted)]">
          <T k="invitations.emptyBody" />
        </p>
      </div>
    </section>
  );
}
