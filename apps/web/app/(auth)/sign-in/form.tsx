"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}

export function SignInForm({
  callbackError,
  redirectTo,
}: {
  callbackError: string | null;
  redirectTo: string;
}) {
  const [state, formAction] = useActionState(signIn, initialState);

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm leading-6 text-zinc-600">
          Continue to your groups, bills, and settlements.
        </p>
      </div>

      <form action={formAction} className="grid gap-4">
        <input name="redirectTo" type="hidden" value={redirectTo} />
        <Alert tone="error">{state.error ?? callbackError}</Alert>
        <Input
          autoCapitalize="none"
          autoComplete="email"
          label="Email"
          name="email"
          required
          type="email"
        />
        <Input
          autoComplete="current-password"
          label="Password"
          name="password"
          required
          type="password"
        />
        <SubmitButton />
      </form>

      <div className="flex items-center justify-between gap-4 text-sm">
        <Link className="font-semibold text-zinc-950 underline" href="/sign-up">
          Create account
        </Link>
        <Link
          className="font-semibold text-zinc-950 underline"
          href="/forgot-password"
        >
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
