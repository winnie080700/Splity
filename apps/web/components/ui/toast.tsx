type ToastProps = {
  children?: React.ReactNode;
  tone?: "success" | "error" | "info";
};

const tones = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-zinc-200 bg-white text-zinc-800",
};

export function Toast({ children, tone = "info" }: ToastProps) {
  if (!children) return null;

  return (
    <div className={["rounded-md border px-4 py-3 text-sm shadow-sm", tones[tone]].join(" ")}>
      {children}
    </div>
  );
}
