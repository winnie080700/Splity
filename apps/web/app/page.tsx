import { redirect } from "next/navigation";

import { LandingPage } from "@/app/landing-page";
import { getUser } from "@/lib/auth/server";

export default async function Home() {
  const user = await getUser();
  if (user) redirect("/groups");

  return <LandingPage />;
}
