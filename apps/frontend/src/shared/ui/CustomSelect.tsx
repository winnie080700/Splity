import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { CheckIcon, ChevronDownIcon } from "@/shared/ui/icons";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type CustomSelectOption = {
  value: string;
  label: string;
  description?: string;
  meta?: string;
  icon?: ReactNode;
};

export const CustomSelect = forwardRef<HTMLButtonElement, {
  ariaLabel: string;
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  compact?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
}>(
  function CustomSelect(
    {
      ariaLabel,
      value,
      options,
      onChange,
      placeholder,
      disabled = false,
      invalid = false,
      compact = false,
      className,
      triggerClassName,
      menuClassName
    },
    forwardedRef
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);

    const selectedOption = useMemo(
      () => options.find((option) => option.value === value) ?? null,
      [options, value]
    );

    useEffect(() => {
      if (!open) {
        return;
      }

      const handlePointerDown = (event: MouseEvent) => {
        const target = event.target as Node;
        if (containerRef.current?.contains(target)) {
          return;
        }

        setOpen(false);
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setOpen(false);
          buttonRef.current?.focus();
        }
      };

      document.addEventListener("mousedown", handlePointerDown);
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("mousedown", handlePointerDown);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [open]);

    function setRefs(element: HTMLButtonElement | null) {
      buttonRef.current = element;

      if (typeof forwardedRef === "function") {
        forwardedRef(element);
        return;
      }

      if (forwardedRef) {
        forwardedRef.current = element;
      }
    }

    return (
      <div className={cn("relative", className)} ref={containerRef}>
        <button
          ref={setRefs}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          className={cn(
            "dropdown-trigger",
            compact && "min-h-[36px] rounded-[6px] px-2.5 py-1.5",
            invalid && "border-danger focus:border-danger focus:ring-danger/10",
            disabled && "cursor-not-allowed opacity-60",
            triggerClassName
          )}
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setOpen((current) => !current);
            }
          }}
          type="button"
        >
          <div className="min-w-0 flex-1">
            {selectedOption ? (
              <div className="flex min-w-0 items-center gap-3">
                {selectedOption.icon ? (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-slate-50 text-brand">
                    {selectedOption.icon}
                  </span>
                ) : null}
                <div className="min-w-0">
                  {selectedOption.meta && !compact ? (
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      {selectedOption.meta}
                    </div>
                  ) : null}
                  <div className={cn("truncate text-sm font-medium text-ink", compact && "text-[13px]")}>
                    {selectedOption.label}
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-sm text-muted">{placeholder ?? ariaLabel}</span>
            )}
          </div>

          <ChevronDownIcon className={cn("h-4 w-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
        </button>

        {open ? (
          <div
            className={cn(
              "dropdown-surface absolute left-0 top-[calc(100%+0.375rem)] z-[70] min-w-full max-w-[14rem]",
              menuClassName
            )}
          >
            <div className="max-h-72 overflow-y-auto pr-1">
              <div className="space-y-1" role="listbox">
                {options.map((option) => {
                  const isActive = option.value === value;

                  return (
                    <button
                      key={option.value}
                      aria-selected={isActive}
                      className={cn(
                        "dropdown-option",
                        isActive ? "dropdown-option-active" : "text-muted hover:text-ink"
                      )}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                        buttonRef.current?.focus();
                      }}
                      role="option"
                      type="button"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        {option.icon ? (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-slate-50 text-brand">
                            {option.icon}
                          </span>
                        ) : null}
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-ink">{option.label}</div>
                          {option.description ? (
                            <div className="mt-0.5 text-[11px] leading-4 text-muted">{option.description}</div>
                          ) : null}
                        </div>
                      </div>

                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border transition",
                          isActive
                            ? "border-brand/20 bg-brand text-white"
                            : "border-slate-200 bg-white text-transparent"
                        )}
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
);
