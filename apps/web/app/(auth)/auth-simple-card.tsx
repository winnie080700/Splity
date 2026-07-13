"use client";

import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";

export function AuthSimpleCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(900px_480px_at_6%_0%,#fbe9c7_0%,transparent_55%),radial-gradient(760px_420px_at_100%_10%,#e0e6ff_0%,transparent_50%),var(--splity-bg)] px-3 py-5 text-[var(--splity-ink)] sm:px-4 sm:py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 sm:gap-8">
        <Link href="/" aria-label="Splity home">
          <BrandMark />
        </Link>
        <section className="rounded-[20px] border border-[var(--splity-line)] bg-white p-4 shadow-[0_20px_50px_rgba(12,21,56,0.08)] sm:rounded-[24px] sm:p-6">
          {children}
        </section>
      </div>
    </div>
  );
}
