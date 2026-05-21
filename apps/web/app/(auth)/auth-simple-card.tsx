"use client";

import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";

export function AuthSimpleCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(900px_480px_at_6%_0%,#fbe9c7_0%,transparent_55%),radial-gradient(760px_420px_at_100%_10%,#e0e6ff_0%,transparent_50%),var(--splity-bg)] px-4 py-10 text-[var(--splity-ink)]">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <Link href="/" aria-label="Splity home">
          <BrandMark />
        </Link>
        <section className="rounded-[24px] border border-[var(--splity-line)] bg-white p-6 shadow-[0_20px_50px_rgba(12,21,56,0.08)]">
          {children}
        </section>
      </div>
    </div>
  );
}
