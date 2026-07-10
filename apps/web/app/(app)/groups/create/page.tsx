import { CreateGroupSetupScreen } from "./create-group-setup-screen";
import { getAppUser, requireUser } from "@/lib/auth/server";

export default async function CreateGroupPage() {
  const [user, appUser] = await Promise.all([requireUser(), getAppUser()]);
  const ownerName =
    appUser?.name ??
    (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null) ??
    user.email ??
    "Splity";

  return (
    <CreateGroupSetupScreen
      ownerParticipant={{
        id: user.id,
        name: ownerName,
        username: appUser?.username ?? null,
      }}
    />
  );
}
