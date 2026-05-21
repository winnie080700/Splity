import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-950">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Splity
        </Link>
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          {children}
        </section>
      </div>
    </main>
  );
}
