"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  requestPasswordReset,
  type ForgotPasswordState,
} from "./actions";

const initialState: ForgotPasswordState = {
  error: null,
  success: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? "Sending reset link..." : "Send reset link"}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(requestPasswordReset, initialState);

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="text-sm leading-6 text-zinc-600">
          Enter your email and we will send a recovery link.
        </p>
      </div>

      <form action={formAction} className="grid gap-4">
        <Alert tone="error">{state.error}</Alert>
        <Alert tone="success">{state.success}</Alert>
        <Input
          autoCapitalize="none"
          autoComplete="email"
          label="Email"
          name="email"
          required
          type="email"
        />
        <SubmitButton />
      </form>

      <Link className="text-center text-sm font-semibold underline" href="/sign-in">
        Back to sign in
      </Link>
    </div>
  );
}
