"use client";

import { ArrowRightIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";

export function AuthSubmitButton({
  idleLabel,
  pendingLabel,
}: {
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  const toastId = useRef<string | number | null>(null);

  useEffect(() => {
    if (pending && toastId.current === null) {
      toastId.current = toast.loading(pendingLabel);
    }
    if (!pending && toastId.current !== null) {
      toast.dismiss(toastId.current);
      toastId.current = null;
    }
    return () => {
      if (toastId.current !== null) toast.dismiss(toastId.current);
    };
  }, [pending, pendingLabel]);

  return (
    <button
      className="group mt-1 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-[14px] bg-[var(--splity-navy)] px-5 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_22px_rgba(27,42,107,0.24)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_14px_28px_rgba(27,42,107,0.28)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? <Spinner /> : <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
      <span>{pending ? pendingLabel : idleLabel}</span>
    </button>
  );
}

export function AuthField({
  autoCapitalize,
  autoComplete,
  hint,
  label,
  minLength,
  name,
  placeholder,
  prefix,
  type = "text",
  mono = false,
}: {
  autoCapitalize?: React.InputHTMLAttributes<HTMLInputElement>["autoCapitalize"];
  autoComplete?: string;
  hint?: React.ReactNode;
  label: string;
  minLength?: number;
  name: string;
  placeholder?: string;
  prefix?: string;
  type?: React.HTMLInputTypeAttribute;
  mono?: boolean;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--splity-muted)]">
        {label}
      </span>
      <span className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--splity-line)] bg-[#fbfaf5] px-3.5 transition focus-within:border-[var(--splity-navy)] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(27,42,107,0.08)]">
        {prefix ? (
          <span className=" text-sm text-[var(--splity-muted)]">
            {prefix}
          </span>
        ) : null}
        <input
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          className={[
            "min-w-0 flex-1 bg-transparent py-3 text-[15px] text-[var(--splity-ink)] outline-none placeholder:text-[rgba(90,96,121,0.55)]",
            mono ? " text-sm" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          minLength={minLength}
          name={name}
          placeholder={placeholder}
          required
          type={type}
        />
      </span>
      {hint ? (
        <span className="flex justify-between gap-3 text-[11px] text-[var(--splity-muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
