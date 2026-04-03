import type { CSSProperties } from "react";

type AnimatedPillOption<T extends string> = {
  value: T;
  label: string;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function AnimatedPillSwitch<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = "compact",
  className
}: {
  value: T;
  options: AnimatedPillOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "compact" | "regular";
  className?: string;
}) {
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const style = {
    "--animated-pill-count": String(Math.max(1, options.length)),
    "--animated-pill-index": String(selectedIndex)
  } as CSSProperties;

  return (
    <div
      className={cn("animated-pill-switch", size === "regular" ? "animated-pill-switch-regular" : "animated-pill-switch-compact", className)}
      role="group"
      aria-label={ariaLabel}
      style={style}
    >
      <span className="animated-pill-thumb" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn("animated-pill-option", option.value === value && "animated-pill-option-active")}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
