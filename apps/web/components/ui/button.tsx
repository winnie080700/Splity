type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
};

const variants = {
  primary:
    "bg-zinc-950 text-white shadow-sm hover:bg-zinc-800 focus-visible:outline-zinc-950",
  secondary:
    "border border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-50 focus-visible:outline-zinc-950",
  ghost:
    "text-zinc-700 hover:bg-zinc-100 focus-visible:outline-zinc-950",
};

export function buttonClassName(variant: ButtonProps["variant"] = "primary") {
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
