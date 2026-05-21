"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp, type SignUpState } from "./actions";

const initialState: SignUpState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? "Creating account..." : "Create account"}
    </Button>
  );
}

export default function SignUpPage() {
  const [state, formAction] = useActionState(signUp, initialState);

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="text-sm leading-6 text-zinc-600">
          Use an email and username so friends can invite you to groups.
        </p>
      </div>

      <form action={formAction} className="grid gap-4">
        <Alert tone="error">{state.error}</Alert>
        <Input autoComplete="name" label="Name" name="name" required />
        <Input
          autoCapitalize="none"
          autoComplete="username"
          hint="Letters, numbers, dot, underscore, or dash. No @ needed."
          label="Username"
          name="username"
          required
        />
        <Input
          autoCapitalize="none"
          autoComplete="email"
          label="Email"
          name="email"
          required
          type="email"
        />
        <Input
          autoComplete="new-password"
          label="Password"
          minLength={6}
          name="password"
          required
          type="password"
        />
        <SubmitButton />
      </form>

      <p className="text-center text-sm text-zinc-600">
        Already have an account?{" "}
        <Link className="font-semibold text-zinc-950 underline" href="/sign-in">
          Sign in
        </Link>
      </p>
    </div>
  );
}
