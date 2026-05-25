import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { T } from "@/components/i18n/t";
import { Badge } from "@/components/ui/badge";
import { GROUP_STATUS } from "@/lib/domain/status";
import { getAppUser } from "@/lib/auth/server";
import { getGroup } from "@/lib/services/groups";
import { getActiveShare } from "@/lib/services/settlement-shares";
import { ShareForm } from "./share-form";

type SharePageProps = {
  params: Promise<{ groupId: string }>;
};

function originFromHeaders(headerList: Headers) {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function GroupSharePage({ params }: SharePageProps) {
  const { groupId } = await params;
  const [group, activeShare, appUser, headerList] = await Promise.all([
    getGroup(groupId),
    getActiveShare(groupId),
    getAppUser(),
    headers(),
  ]);

  if (!group) notFound();

  const canGenerate = group.status === GROUP_STATUS.settling;
  const publicUrl = activeShare ? `${originFromHeaders(headerList)}/share/${activeShare.shareToken}` : null;

  return (
    <div className="grid gap-6">
      <div>
        <Link className="text-sm font-semibold text-zinc-600 underline" href={`/groups/${groupId}`}>
          <T k="groups.backToGroup" />
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <T k="share.publicLink" />
          </h1>
          <p className="mt-2 text-sm text-zinc-500">{group.name}</p>
        </div>
        <Badge tone={activeShare ? "green" : "neutral"}>
          <T k={activeShare ? "share.active" : "share.noActiveShare"} />
        </Badge>
      </header>

      {activeShare && publicUrl ? (
        <section className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">
            <T k="share.currentPublicUrl" />
          </h2>
          <div className="break-all rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{publicUrl}</div>
          <p className="text-sm text-zinc-500">
            <T k="share.generated" values={{ date: new Date(activeShare.createdAtUtc).toLocaleString() }} />
          </p>
        </section>
      ) : null}

      {!canGenerate ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <T k="share.generateLocked" />
        </div>
      ) : null}

      <ShareForm
        activeShare={activeShare}
        canGenerate={canGenerate}
        defaultAccountName={appUser?.default_payment_account_name ?? ""}
        defaultAccountNumber={appUser?.default_payment_account_number ?? ""}
        defaultCreatorName={appUser?.name ?? ""}
        defaultNotes={appUser?.default_payment_notes ?? ""}
        defaultPayeeName={appUser?.default_payment_payee_name ?? appUser?.name ?? ""}
        defaultPaymentMethod={appUser?.default_payment_method ?? ""}
        defaultPaymentQrDataUrl={appUser?.default_payment_qr_data_url ?? ""}
        groupId={groupId}
      />
    </div>
  );
}
