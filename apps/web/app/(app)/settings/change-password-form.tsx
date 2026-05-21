"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePasswordAction, type SettingsActionState } from "./actions";

const initialState: SettingsActionState = { error: null, success: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? "Updating..." : "Change password"}
    </Button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-zinc-950">Change password</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Confirm your current password before setting a new one.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          autoComplete="current-password"
          label="Current password"
          name="currentPassword"
          required
          type="password"
        />
        <Input
          autoComplete="new-password"
          label="New password"
          minLength={6}
          name="newPassword"
          required
          type="password"
        />
        <Input
          autoComplete="new-password"
          label="Confirm new password"
          minLength={6}
          name="confirmNewPassword"
          required
          type="password"
        />
      </div>
      <Alert tone="error">{state.error}</Alert>
      <Alert tone="success">{state.success}</Alert>
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
