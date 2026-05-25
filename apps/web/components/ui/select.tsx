"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  className?: string;
  defaultValue?: string;
  label: React.ReactNode;
  name: string;
  options: SelectOption[];
};

export function Select({
  className,
  defaultValue,
  label,
  name,
  options,
}: SelectProps) {
  const [value, setValue] = useState(defaultValue ?? options[0]?.value ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLLabelElement | null>(null);
  const firstValue = options[0]?.value ?? "";
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    setValue(defaultValue ?? firstValue);
  }, [defaultValue, firstValue]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
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

  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-800" ref={rootRef}>
      <span>{label}</span>
      <input name={name} type="hidden" value={value} />
      <div className="relative">
        <button
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={[
            "inline-flex h-11 w-full items-center justify-between gap-2 rounded-md border border-zinc-300 bg-white px-3 text-left text-base text-zinc-950 shadow-sm outline-none transition hover:bg-zinc-50 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span>{selected?.label}</span>
          <ChevronDownIcon aria-hidden="true" className={`h-4 w-4 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen ? (
          <div
            className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-zinc-200 bg-white p-1 text-sm text-zinc-950 shadow-lg"
            role="listbox"
          >
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  aria-selected={isSelected}
                  className="flex h-9 w-full items-center justify-between rounded-sm px-2.5 text-left outline-none transition hover:bg-zinc-100 focus:bg-zinc-100"
                  key={option.value}
                  onClick={() => {
                    setValue(option.value);
                    setIsOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  <span>{option.label}</span>
                  {isSelected ? <CheckIcon aria-hidden="true" className="h-4 w-4 text-zinc-950" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </label>
  );
}
