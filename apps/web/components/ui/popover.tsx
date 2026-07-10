"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentProps } from "react";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({
  align = "center",
  className,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        className={[
          "pointer-events-auto z-[60] rounded-2xl border border-[var(--splity-line)] bg-white shadow-[0_18px_45px_rgba(12,21,56,0.14)] outline-none data-[state=open]:splity-popover-in",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        sideOffset={sideOffset}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export function PopoverArrow(props: ComponentProps<typeof PopoverPrimitive.Arrow>) {
  return (
    <PopoverPrimitive.Arrow
      className="fill-white stroke-[var(--splity-line)]"
      {...props}
    />
  );
}
