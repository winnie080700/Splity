"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createGroupAction, type CreateGroupState } from "./actions";

const initialState: CreateGroupState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? "Creating..." : "New group"}
    </Button>
  );
}

export function NewGroupForm() {
  const [state, formAction] = useActionState(createGroupAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]">
      <div className="grid gap-3">
        <Alert tone="error">{state.error}</Alert>
        <Input
          label="Group name"
          name="name"
          placeholder="Weekend trip"
          required
        />
      </div>
      <div className="flex items-end">
        <SubmitButton />
      </div>
    </form>
  );
}
