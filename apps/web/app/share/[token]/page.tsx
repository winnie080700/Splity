import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link2 } from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
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
  return (
    <main className="min-h-screen bg-[#f6f7f4] text-[var(--splity-ink)]">
      <div className="mx-auto grid w-full max-w-7xl gap-3 px-3 py-3 sm:gap-5 sm:px-6 sm:py-8">
        <header className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:rounded-3xl sm:px-8 sm:py-6 lg:px-10">
          <div className="relative z-10 grid items-center gap-3 sm:gap-6 lg:grid-cols-[220px_1fr_180px]">
            <div className="border-slate-200 lg:border-r">
              <BrandMark className="text-teal-700" size="lg" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="splity-display text-2xl font-extrabold tracking-tight text-[var(--splity-ink)] sm:text-4xl">
                  <T k="share.pageTitle" />
                </h1>
                <span className="inline-flex h-8 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700">
                  <T k="share.active" />
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-600 sm:mt-3 sm:text-sm">
                <span><T k="share.groupLabel" />: {share.group_name ?? share.creator_name ?? <T k="common.appName" />}</span>
                <span aria-hidden="true">•</span>
                <span><T k="share.generated" values={{ date: generatedAt }} /></span>
              </div>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-600 sm:mt-4 sm:text-base sm:leading-6">
                <T k="share.heroBody" />
              </p>
            </div>
            <div aria-hidden="true" className="hidden justify-self-end lg:block">
              <div className="grid h-28 w-28 place-items-center rounded-full border border-teal-200 bg-teal-50 text-teal-600 shadow-inner">
                <Link2 className="h-12 w-12" strokeWidth={1.7} />
              </div>
            </div>
          </div>
        </header>
        <ShareDisplay generatedAt={generatedAt} share={share} />
      </div>
    </main>
  );
}
