import type { Metadata } from "next";
import { notFound } from "next/navigation";

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

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8">
        <header className="border-b border-zinc-200 pb-5">
          <p className="text-sm font-semibold text-zinc-500">Settlement from</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {share.creator_name ?? "Splity"}
          </h1>
        </header>
        <ShareDisplay share={share} />
      </div>
    </main>
  );
}
