"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfileAction, type SettingsActionState } from "./actions";

type ProfileFormProps = {
  name: string;
  username: string;
};

const initialState: SettingsActionState = { error: null, success: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? "Saving..." : "Save profile"}
    </Button>
  );
}

export function ProfileForm({ name, username }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-zinc-950">Profile</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Update the name and username friends see when inviting you.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          autoComplete="name"
          defaultValue={name}
          label="Display name"
          maxLength={150}
          name="name"
          required
        />
        <Input
          autoComplete="username"
          defaultValue={username}
          hint="3-30 characters: letters, numbers, dot, underscore, or dash."
          label="Username"
          maxLength={30}
          minLength={3}
          name="username"
          pattern="[a-z0-9._-]{3,30}"
          required
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
