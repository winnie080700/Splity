type TableRowProps = React.HTMLAttributes<HTMLDivElement>;

export function TableRow({ className, ...props }: TableRowProps) {
  return (
    <div
      className={[
        "grid gap-3 border-b border-zinc-100 px-4 py-3 text-sm last:border-b-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
