import { notFound } from "next/navigation";

import { getGroup, GROUP_STATUS } from "@/lib/services/groups";
import { listBillFormParticipants } from "@/lib/services/bills";
import { BillForm } from "./bill-form";
import { createBillAction } from "./actions";

type NewBillPageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function NewBillPage({ params }: NewBillPageProps) {
  const { groupId } = await params;
  const [group, participants] = await Promise.all([
    getGroup(groupId),
    listBillFormParticipants(groupId),
  ]);

  if (!group) notFound();

  return (
    <BillForm
      action={createBillAction.bind(null, groupId)}
      canEdit={group.status === GROUP_STATUS.unresolved}
      participants={participants}
    />
  );
}
