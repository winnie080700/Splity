import { SignInForm } from "./form";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
    redirectTo?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;

  return (
    <SignInForm
      callbackError={params.error ?? null}
      redirectTo={params.redirectTo ?? "/dashboard"}
    />
  );
}
