import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { T } from "@/components/i18n/t";
import { resolvePublicShare } from "@/lib/services/settlement-shares";
import { ShareDisplay } from "./share-display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

type PublicSharePageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicSharePage({ params }: PublicSharePageProps) {
  const { token } = await params;
  const share = await resolvePublicShare(token);

  if (!share) notFound();

  const generatedAt = new Date(share.created_at_utc).toLocaleString();
  const period =
    share.from_date_utc || share.to_date_utc
      ? {
          from: share.from_date_utc
            ? new Date(share.from_date_utc).toLocaleDateString()
            : "-",
          to: share.to_date_utc ? new Date(share.to_date_utc).toLocaleDateString() : "-",
        }
      : null;

  return (
    <main className="min-h-screen bg-[var(--splity-bg)] text-[var(--splity-ink)]">
      <div className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-6 sm:px-6 sm:py-8">
        <header className="rounded-2xl border border-[var(--splity-line)] bg-white p-5 shadow-[0_2px_8px_rgba(12,21,56,0.06)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--splity-muted)]">
                <T k="share.settlementFrom" />
              </p>
              <h1 className="splity-display mt-1 text-3xl font-extrabold text-[var(--splity-ink)] sm:text-4xl">
                {share.creator_name ?? <T k="common.appName" />}
              </h1>
            </div>
            <span className="inline-flex h-8 items-center rounded-md border border-sky-200 bg-sky-50 px-3 text-sm font-bold text-sky-700">
              <T k="share.active" />
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-[var(--splity-muted)]">
            <span className="rounded-md border border-[var(--splity-line)] bg-[var(--splity-bg)] px-3 py-2">
              <T k="share.generated" values={{ date: generatedAt }} />
            </span>
            {period ? (
              <span className="rounded-md border border-[var(--splity-line)] bg-[var(--splity-bg)] px-3 py-2">
                <T k="share.period" values={period} />
              </span>
            ) : null}
          </div>
        </header>
        <ShareDisplay share={share} />
      </div>
    </main>
  );
}
