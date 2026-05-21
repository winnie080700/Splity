import { CombinedAuthPage } from "../combined-auth-page";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
    mode?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;

  return (
    <CombinedAuthPage
      callbackError={params.error ?? null}
      initialMode={params.mode === "register" ? "register" : "login"}
      redirectTo="/dashboard"
    />
  );
}
