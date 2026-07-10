import { redirect } from "next/navigation";

export default function LegacyCreateGroupStepPage() {
  redirect("/groups/create");
}
