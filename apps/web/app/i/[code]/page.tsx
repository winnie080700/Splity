import Link from "next/link";
import { redirect } from "next/navigation";

import { T } from "@/components/i18n/t";
import { getUser } from "@/lib/auth/server";
import { acceptGroupInviteLink, getGroupInviteLinkInfo } from "@/lib/services/group-invite-links";

async function joinInviteAction(code: string) {
  "use server";

  const groupId = await acceptGroupInviteLink(code);
  redirect(`/groups/${groupId}?tab=participants`);
}

export default async function InviteLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [user, invite] = await Promise.all([
    getUser(),
    getGroupInviteLinkInfo(code).catch(() => null),
  ]);
  if (!invite) {
    return (
      <main className="mx-auto grid min-h-screen max-w-lg place-content-center gap-3 px-4 text-center sm:gap-4 sm:px-6">
        <h1 className="splity-display text-2xl font-bold text-[var(--splity-ink)] sm:text-3xl">
          <T k="invite.invalidTitle" />
        </h1>
        <p className="text-sm text-[var(--splity-muted)]">
          <T k="invite.invalidBody" />
        </p>
        <Link className="font-bold text-teal-700" href="/groups">
          <T k="common.backToGroups" />
        </Link>
      </main>
    );
  }

  const redirectTo = encodeURIComponent(`/i/${code}`);

  return (
    <main className="mx-auto grid min-h-screen max-w-lg place-content-center px-3 sm:px-6">
      <section className="rounded-2xl border border-[var(--splity-line)] bg-white p-5 text-center shadow-[0_18px_50px_rgba(12,21,56,0.10)] sm:rounded-3xl sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-700">
          <T k="invite.kicker" />
        </p>
        <h1 className="splity-display mt-2 text-2xl font-extrabold text-[var(--splity-ink)] sm:mt-3 sm:text-3xl">
          <T k="invite.joinTitle" values={{ group: invite.groupName ?? "" }} />
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--splity-muted)]">
          <T k={user ? "invite.joinBody" : "invite.authBody"} />
        </p>
        {user ? (
          <form action={joinInviteAction.bind(null, code)} className="mt-4 sm:mt-6">
            <button className="h-11 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white transition hover:bg-teal-800" type="submit">
              <T k="invite.join" />
            </button>
          </form>
        ) : (
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:mt-6">
            <Link className="inline-flex h-11 items-center rounded-xl bg-teal-700 px-5 text-sm font-bold text-white transition hover:bg-teal-800" href={`/sign-in?redirectTo=${redirectTo}`}>
              <T k="auth.signIn" />
            </Link>
            <Link className="inline-flex h-11 items-center rounded-xl border border-[var(--splity-line)] px-5 text-sm font-bold text-[var(--splity-ink)] transition hover:bg-[var(--splity-bg)]" href={`/sign-in?mode=register&redirectTo=${redirectTo}`}>
              <T k="auth.createAccount" />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
