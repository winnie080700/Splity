type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
};

const variants = {
  primary:
    "bg-[#087f6f] text-white shadow-sm hover:bg-[#066c60] focus-visible:outline-[#087f6f]",
  secondary:
    "border border-zinc-300 bg-white text-zinc-950 hover:border-[#087f6f] hover:bg-emerald-50 hover:text-[#087f6f] focus-visible:outline-[#087f6f]",
  ghost:
    "text-zinc-700 hover:bg-emerald-50 hover:text-[#087f6f] focus-visible:outline-[#087f6f]",
};

function buttonClassName(variant: ButtonProps["variant"] = "primary") {
  return [
    "inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    variants[variant],
  ].join(" ");
}

export function Button({
  children,
  className,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[buttonClassName(variant), className].filter(Boolean).join(" ")}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
