import { AuthSimpleCard } from "../auth-simple-card";
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
  return (
    <AuthSimpleCard>
      <VerifyEmailForm email={params.email ?? ""} />
    </AuthSimpleCard>
  );
}
