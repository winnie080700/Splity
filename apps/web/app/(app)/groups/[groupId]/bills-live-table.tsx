"use client";

import { Plus, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState, type ReactNode } from "react";

import { BillsTable } from "@/components/ui/bill-table";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { useTranslation } from "@/lib/i18n";
import type { BillDetail } from "@/lib/calculations/bill-read-projection";
import type { Participant } from "@/lib/services/participants";
import { createBillAction, deleteBillAction } from "./bills/actions";
import { BillForm } from "./bills/bill-form";

export function BillsLiveTable({
  actions,
  bills,
  canEdit,
  groupId,
  participants,
}: {
  actions?: ReactNode;
  bills: BillDetail[];
  canEdit: boolean;
  groupId: string;
  participants: Participant[];
}) {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteBill, setDeleteBill] = useState<BillDetail | null>(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const participantById = useMemo(
    () => new Map(participants.map((participant) => [participant.id, participant])),
    [participants],
  );
  const filteredBills = useMemo(
    () =>
      deferredSearch
        ? bills.filter((bill) => bill.storeName.toLowerCase().includes(deferredSearch))
        : bills,
    [bills, deferredSearch],
  );
  const { t } = useTranslation();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="splity-display text-2xl font-bold">{t("groupDetail.tabBills")}</h2>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <label className="relative min-w-0 flex-1 sm:w-80 sm:flex-none">
            <span className="sr-only">{t("groupDetail.searchBills")}</span>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--splity-muted)]" />
            <input
              className="h-11 w-full rounded-xl border border-[var(--splity-line-strong)] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("groupDetail.searchBills")}
              type="search"
              value={search}
            />
          </label>
          {actions}
          {canEdit ? (
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white transition hover:bg-teal-800"
              onClick={() => setAddOpen(true)}
              type="button"
            >
              <Plus className="h-4 w-4" />
              {t("groupDetail.addBill")}
            </button>
          ) : null}
        </div>
      </div>
      <BillsTable
        bills={filteredBills}
        canEdit={canEdit}
        groupId={groupId}
        onDelete={(bill) => setDeleteBill(bills.find((item) => item.id === bill.id) ?? null)}
        participantById={participantById}
      />
      <Dialog onOpenChange={setAddOpen} open={addOpen}>
        <DialogContent className="max-w-7xl lg:!overflow-y-hidden" showClose>
          <DialogHeader className="mb-5 border-b border-[var(--splity-line)] pb-4">
            <DialogTitle>{t("groups.newBill")}</DialogTitle>
            <p className="text-sm font-semibold text-[var(--splity-muted)]">{t("bills.editorBody")}</p>
          </DialogHeader>
          <BillForm
            action={createBillAction.bind(null, groupId)}
            canEdit={canEdit}
            onCancel={() => setAddOpen(false)}
            participants={participants}
          />
        </DialogContent>
      </Dialog>
      <AlertDialog onOpenChange={(open) => !open && setDeleteBill(null)} open={Boolean(deleteBill)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bills.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("bills.deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <form action={deleteBillAction}>
            <input name="groupId" type="hidden" value={groupId} />
            <input name="billId" type="hidden" value={deleteBill?.id ?? ""} />
            <AlertDialogFooter>
              <Button onClick={() => setDeleteBill(null)} type="button" variant="secondary">
                {t("common.cancel")}
              </Button>
              <PendingActionButton
                className="bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700"
                pendingLabel={t("groups.deleting")}
                type="submit"
              >
                {t("bills.deleteBill")}
              </PendingActionButton>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
