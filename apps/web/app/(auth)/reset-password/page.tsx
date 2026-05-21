"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPassword, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? "Updating password..." : "Update password"}
    </Button>
  );
}

export default function ResetPasswordPage() {
  const [state, formAction] = useActionState(resetPassword, initialState);

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
        <p className="text-sm leading-6 text-zinc-600">
          Choose a new password for your Splity account.
        </p>
      </div>

      <form action={formAction} className="grid gap-4">
        <Alert tone="error">{state.error}</Alert>
        <Input
          autoComplete="new-password"
          label="New password"
          minLength={6}
          name="password"
          required
          type="password"
        />
        <Input
          autoComplete="new-password"
          label="Confirm new password"
          minLength={6}
          name="confirmPassword"
          required
          type="password"
        />
        <SubmitButton />
      </form>
    </div>
  );
}
