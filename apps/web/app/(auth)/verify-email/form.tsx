"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  resendVerification,
  type ResendVerificationState,
} from "./actions";

const initialState: ResendVerificationState = {
  error: null,
  success: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" variant="secondary">
      {pending ? "Sending..." : "Resend email"}
    </Button>
  );
}

export function VerifyEmailForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(resendVerification, initialState);

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-sm leading-6 text-zinc-600">
          We sent a verification link. Open it in this browser to finish setting
          up your account.
        </p>
      </div>

      <form action={formAction} className="grid gap-4">
        <Alert tone="error">{state.error}</Alert>
        <Alert tone="success">{state.success}</Alert>
        <Input
          autoCapitalize="none"
          autoComplete="email"
          defaultValue={email}
          label="Email"
          name="email"
          required
          type="email"
        />
        <SubmitButton />
      </form>

      <p className="text-center text-sm text-zinc-600">
        Already verified?{" "}
        <Link className="font-semibold text-zinc-950 underline" href="/sign-in">
          Sign in
        </Link>
      </p>
    </div>
  );
}
