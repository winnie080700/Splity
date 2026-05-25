"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useTranslation, type Locale } from "@/lib/i18n";

type LanguageSelectProps = {
  className?: string;
};

export function LanguageSelect({ className = "" }: LanguageSelectProps) {
  const { locale, setLocale, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const options: { label: string; value: Locale }[] = [
    { label: t("common.english"), value: "en" },
    { label: t("common.chinese"), value: "zh" },
  ];
  const selected = options.find((option) => option.value === locale) ?? options[0];

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
    <div className={["relative inline-flex items-center gap-2", className].filter(Boolean).join(" ")} ref={rootRef}>
      <span>{t("common.language")}</span>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t("common.language")}
        className="inline-flex h-9 min-w-[8.75rem] items-center justify-between gap-2 rounded-md border border-[var(--splity-line)] bg-white px-3 text-xs font-semibold uppercase text-[var(--splity-ink)] shadow-sm outline-none transition hover:bg-[#fbfaf5] focus:border-[var(--splity-navy)] focus:ring-2 focus:ring-[rgba(27,42,107,0.12)]"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>{selected.label}</span>
        <ChevronDownIcon
          aria-hidden="true"
          className={`h-4 w-4 text-[var(--splity-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div
          className="absolute bottom-full right-0 z-50 mb-2 w-44 overflow-hidden rounded-md border border-[var(--splity-line)] bg-white p-1 text-xs text-[var(--splity-ink)] shadow-lg"
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === locale;

            return (
              <button
                aria-selected={isSelected}
                className="flex h-9 w-full items-center justify-between rounded-sm px-2.5 text-left font-semibold uppercase outline-none transition hover:bg-[#f2f1ec] focus:bg-[#f2f1ec]"
                key={option.value}
                onClick={() => {
                  setLocale(option.value);
                  setIsOpen(false);
                }}
                role="option"
                type="button"
              >
                <span>{option.label}</span>
                {isSelected ? <CheckIcon aria-hidden="true" className="h-4 w-4 text-[var(--splity-navy)]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
