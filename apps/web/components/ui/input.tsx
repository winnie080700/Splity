type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  name: string;
};

export function Input({ className, hint, id, label, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-800">
      <span>{label}</span>
      <input
        id={inputId}
        className={[
          "h-11 rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-[#087f6f] focus:ring-2 focus:ring-[rgba(8,127,111,0.12)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      {hint ? <span className="text-xs font-normal text-zinc-500">{hint}</span> : null}
    </label>
  );
}
