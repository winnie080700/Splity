type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={["animate-pulse rounded-md bg-zinc-200", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
