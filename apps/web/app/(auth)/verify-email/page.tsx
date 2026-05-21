import { VerifyEmailForm } from "./form";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  return <VerifyEmailForm email={params.email ?? ""} />;
}
