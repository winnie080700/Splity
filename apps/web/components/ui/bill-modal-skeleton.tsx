export function BillModalSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-[24px] border border-[var(--splity-line)] bg-white p-5">
        <div className="h-3 w-24 animate-pulse rounded-full bg-zinc-200" />
        <div className="mt-3 h-8 w-52 animate-pulse rounded-lg bg-zinc-200" />
        {compact ? null : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  className="h-20 animate-pulse rounded-2xl bg-zinc-100"
                  key={index}
                />
              ))}
            </div>
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  className="h-24 animate-pulse rounded-2xl bg-zinc-100"
                  key={index}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
