type AlertProps = {
  children?: React.ReactNode;
  className?: string;
  tone?: "error" | "success" | "info";
};

const tones = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

export function Alert({
  children,
  className,
  tone = "info",
}: AlertProps) {
  if (!children) return null;

  return (
    <div
      className={[
        "rounded-md border px-3 py-2 text-sm leading-6",
        tones[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
