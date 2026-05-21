import Link from "next/link";

import { requireUser } from "@/lib/auth/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireUser();

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
        <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-600">
          <Link className="rounded-md px-3 py-2 transition hover:bg-white hover:text-zinc-950" href="/dashboard">
            Dashboard
          </Link>
          <Link className="rounded-md px-3 py-2 transition hover:bg-white hover:text-zinc-950" href="/invitations">
            Invitations
          </Link>
          <Link className="rounded-md px-3 py-2 transition hover:bg-white hover:text-zinc-950" href="/settings">
            Settings
          </Link>
        </nav>
        {children}
      </div>
    </main>
  );
}
