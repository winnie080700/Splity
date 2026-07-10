"use client";

import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useRef, type ComponentProps } from "react";
import { DayPicker, getDefaultClassNames, type DayButton } from "react-day-picker";

function classes(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={classes("w-fit bg-white p-3", className)}
      classNames={{
        root: classes("w-fit", defaults.root),
        months: classes("relative flex flex-col", defaults.months),
        month: classes("flex w-full flex-col gap-3", defaults.month),
        nav: classes("absolute inset-x-0 top-0 flex items-center justify-between", defaults.nav),
        button_previous: classes(
          "inline-flex size-8 items-center justify-center rounded-lg text-[var(--splity-muted)] transition hover:bg-emerald-50 hover:text-[#087f6f]",
          defaults.button_previous
        ),
        button_next: classes(
          "inline-flex size-8 items-center justify-center rounded-lg text-[var(--splity-muted)] transition hover:bg-emerald-50 hover:text-[#087f6f]",
          defaults.button_next
        ),
        month_caption: classes(
          "flex h-8 items-center justify-center px-9 text-sm font-extrabold text-[var(--splity-ink)]",
          defaults.month_caption
        ),
        caption_label: classes("select-none", defaults.caption_label),
        month_grid: classes("w-full border-collapse", defaults.month_grid),
        weekdays: classes("flex", defaults.weekdays),
        weekday: classes(
          "flex size-9 items-center justify-center text-xs font-bold text-[var(--splity-muted)]",
          defaults.weekday
        ),
        week: classes("flex w-full", defaults.week),
        day: classes("relative size-9 p-0 text-center", defaults.day),
        today: classes("rounded-lg bg-emerald-50", defaults.today),
        outside: classes("text-[var(--splity-muted)] opacity-45", defaults.outside),
        disabled: classes("pointer-events-none opacity-35", defaults.disabled),
        hidden: classes("invisible", defaults.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeftIcon aria-hidden="true" size={16} {...chevronProps} />
          ) : orientation === "right" ? (
            <ChevronRightIcon aria-hidden="true" size={16} {...chevronProps} />
          ) : (
            <ChevronDownIcon aria-hidden="true" size={16} {...chevronProps} />
          ),
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  modifiers,
  ...props
}: ComponentProps<typeof DayButton>) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <button
      ref={ref}
      className={classes(
        "inline-flex size-9 items-center justify-center rounded-lg text-sm font-semibold text-[var(--splity-ink)] transition hover:bg-emerald-50 hover:text-[#087f6f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#087f6f]",
        modifiers.selected ? "bg-[#087f6f] text-white hover:bg-[#066c60] hover:text-white" : undefined,
        className
      )}
      type="button"
      {...props}
    />
  );
}
