"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  className?: string;
  compact?: boolean;
  defaultValue?: string;
  label: React.ReactNode;
  name: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  value?: string;
};

export function Select({
  className,
  compact = false,
  defaultValue,
  label,
  name,
  onValueChange,
  options,
  value: controlledValue,
}: SelectProps) {
  const [value, setValue] = useState(defaultValue ?? options[0]?.value ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const firstValue = options[0]?.value ?? "";
  const currentValue = controlledValue ?? value;
  const selected = options.find((option) => option.value === currentValue) ?? options[0];

  const buttonClassName = compact
    ? "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-zinc-300 bg-white px-3 text-left text-sm text-zinc-950 shadow-sm outline-none transition hover:border-[#087f6f] hover:bg-emerald-50 focus:border-[#087f6f] focus:ring-2 focus:ring-[rgba(8,127,111,0.12)]"
    : "inline-flex h-11 w-full items-center justify-between gap-2 rounded-md border border-zinc-300 bg-white px-3 text-left text-base text-zinc-950 shadow-sm outline-none transition hover:border-[#087f6f] hover:bg-emerald-50 focus:border-[#087f6f] focus:ring-2 focus:ring-[rgba(8,127,111,0.12)]";

  useEffect(() => {
    if (controlledValue === undefined) {
      setValue(defaultValue ?? firstValue);
    }
  }, [controlledValue, defaultValue, firstValue]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function updateMenuStyle() {
      const rect = buttonRef.current?.getBoundingClientRect();
      const target = (rootRef.current?.closest(".splity-modal-panel") as HTMLElement | null) ?? document.body;
      if (!rect || !target) return;

      const targetRect = target.getBoundingClientRect();
      const isBodyTarget = target === document.body;

      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const maxHeight = Math.max(160, Math.min(280, Math.max(spaceBelow, spaceAbove)));
      const opensAbove = spaceBelow < 180 && spaceAbove > spaceBelow;

      setPortalTarget(target);
      setMenuStyle({
        left: isBodyTarget ? rect.left + window.scrollX : rect.left - targetRect.left + target.scrollLeft,
        maxHeight,
        top: isBodyTarget
          ? (opensAbove ? rect.top - maxHeight - 4 : rect.bottom + 4) + window.scrollY
          : (opensAbove ? rect.top - maxHeight - 4 : rect.bottom + 4) - targetRect.top + target.scrollTop,
        width: rect.width,
      });
    }

    updateMenuStyle();
    window.addEventListener("resize", updateMenuStyle);
    window.addEventListener("scroll", updateMenuStyle, true);

    return () => {
      window.removeEventListener("resize", updateMenuStyle);
      window.removeEventListener("scroll", updateMenuStyle, true);
    };
  }, [isOpen]);

  return (
    <div className={compact ? "block" : "grid gap-2 text-sm font-medium text-zinc-800"} ref={rootRef}>
      {compact ? null : <span>{label}</span>}
      <input name={name} type="hidden" value={currentValue} />
      <div className="relative">
        <button
          aria-label={compact && typeof label === "string" ? label : undefined}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={[
            buttonClassName,
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setIsOpen((current) => !current)}
          ref={buttonRef}
          type="button"
        >
          <span>{selected?.label}</span>
          <ChevronDownIcon aria-hidden="true" className={`h-4 w-4 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && menuStyle && portalTarget ? createPortal(
          <div
            className="absolute z-[100] overflow-y-auto rounded-md border border-zinc-200 bg-white p-1 text-sm text-zinc-950 shadow-lg"
            ref={menuRef}
            role="listbox"
            style={menuStyle}
          >
            {options.map((option) => {
              const isSelected = option.value === currentValue;

              return (
                <button
                  aria-selected={isSelected}
                  className="flex h-9 w-full items-center justify-between rounded-sm px-2.5 text-left outline-none transition hover:bg-emerald-50 hover:text-[#087f6f] focus:bg-emerald-50 focus:text-[#087f6f]"
                  key={option.value}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setValue(option.value);
                    onValueChange?.(option.value);
                    setIsOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  <span>{option.label}</span>
                  {isSelected ? <CheckIcon aria-hidden="true" className="h-4 w-4 text-[#087f6f]" /> : null}
                </button>
              );
            })}
          </div>,
          portalTarget
        ) : null}
      </div>
    </div>
  );
}
