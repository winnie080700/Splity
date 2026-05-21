import { notFound } from "next/navigation";

import { getBill, listBillFormParticipants } from "@/lib/services/bills";
import { getGroup, GROUP_STATUS } from "@/lib/services/groups";
import { updateBillAction } from "../../actions";
import { BillForm } from "../../new/bill-form";

type EditBillPageProps = {
  params: Promise<{ groupId: string; billId: string }>;
};

export default async function EditBillPage({ params }: EditBillPageProps) {
  const { groupId, billId } = await params;
  const [group, bill, participants] = await Promise.all([
    getGroup(groupId),
    getBill(groupId, billId),
    listBillFormParticipants(groupId),
  ]);

  if (!group || !bill) notFound();

  return (
    <BillForm
      action={updateBillAction.bind(null, groupId, billId)}
      canEdit={group.status === GROUP_STATUS.unresolved}
      groupId={groupId}
      initialBill={bill}
      participants={participants}
    />
  );
}
