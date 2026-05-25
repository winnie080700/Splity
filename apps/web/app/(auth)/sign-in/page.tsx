import { SignInClient } from "./sign-in-client";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
    mode?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;

  return (
    <SignInClient
      callbackError={params.error ?? null}
      initialMode={params.mode === "register" ? "register" : "login"}
    />
  );
}
