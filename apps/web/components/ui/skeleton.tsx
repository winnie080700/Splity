type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={["animate-pulse rounded-md bg-zinc-200", className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
