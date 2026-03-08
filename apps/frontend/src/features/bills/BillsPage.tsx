import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type BillParticipantInput, type FeeType, type SplitMode } from "@api-client";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useI18n } from "@/shared/i18n/I18nProvider";

export function BillsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const [storeName, setStoreName] = useState("GrocerX");
  const [transactionDateUtc, setTransactionDateUtc] = useState(() => new Date().toISOString().slice(0, 10));
  const [splitMode, setSplitMode] = useState<SplitMode>(1);
  const [itemDescription, setItemDescription] = useState("Groceries");
  const [itemAmount, setItemAmount] = useState("100");
  const [feeName, setFeeName] = useState("SST");
  const [feeType, setFeeType] = useState<FeeType>(1);
  const [feeValue, setFeeValue] = useState("6");
  const [primaryPayerParticipantId, setPrimaryPayerParticipantId] = useState<string>("");
  const [weights, setWeights] = useState<Record<string, string>>({});

  const participantsQuery = useQuery({
    queryKey: ["participants", groupId],
    queryFn: () => apiClient.listParticipants(groupId!),
    enabled: Boolean(groupId)
  });

  const billsQuery = useQuery({
    queryKey: ["bills", groupId],
    queryFn: () => apiClient.listBills(groupId!),
    enabled: Boolean(groupId)
  });

  const participants = participantsQuery.data ?? [];
  const primaryPayer = useMemo(() => {
    if (primaryPayerParticipantId) {
      return primaryPayerParticipantId;
    }

    return participants[0]?.id ?? "";
  }, [participants, primaryPayerParticipantId]);

  const createBillMutation = useMutation({
    mutationFn: async () => {
      const billParticipants: BillParticipantInput[] = participants.map((participant) => ({
        participantId: participant.id,
        weight: splitMode === 2 ? Number(weights[participant.id] ?? "1") : null
      }));

      return apiClient.createBill(groupId!, {
        storeName,
        transactionDateUtc: new Date(transactionDateUtc).toISOString(),
        splitMode,
        primaryPayerParticipantId: primaryPayer,
        items: [{ description: itemDescription, amount: Number(itemAmount) }],
        fees: [{ name: feeName, feeType, value: Number(feeValue) }],
        participants: billParticipants,
        extraContributions: []
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bills", groupId] });
    }
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr,1.2fr]">
      <section className="card p-5">
        <h2 className="text-lg font-semibold">{t("bills.create")}</h2>
        <div className="mt-4 space-y-3">
          <input className="w-full rounded-xl border border-ink/20 px-3 py-2" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder={t("bills.store")} />
          <input className="w-full rounded-xl border border-ink/20 px-3 py-2" type="date" value={transactionDateUtc} onChange={(e) => setTransactionDateUtc(e.target.value)} />
          <select className="w-full rounded-xl border border-ink/20 px-3 py-2" value={splitMode} onChange={(e) => setSplitMode(Number(e.target.value) as SplitMode)}>
            <option value={1}>{t("bills.equal")}</option>
            <option value={2}>{t("bills.weighted")}</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input className="rounded-xl border border-ink/20 px-3 py-2" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} placeholder={t("bills.item")} />
            <input className="rounded-xl border border-ink/20 px-3 py-2" type="number" min="0" step="0.01" value={itemAmount} onChange={(e) => setItemAmount(e.target.value)} placeholder={t("bills.amount")} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input className="rounded-xl border border-ink/20 px-3 py-2" value={feeName} onChange={(e) => setFeeName(e.target.value)} placeholder={t("bills.feeName")} />
            <select className="rounded-xl border border-ink/20 px-3 py-2" value={feeType} onChange={(e) => setFeeType(Number(e.target.value) as FeeType)}>
              <option value={1}>{t("bills.percentage")}</option>
              <option value={2}>{t("bills.fixed")}</option>
            </select>
            <input className="rounded-xl border border-ink/20 px-3 py-2" type="number" min="0" step="0.01" value={feeValue} onChange={(e) => setFeeValue(e.target.value)} placeholder={t("bills.feeValue")} />
          </div>
          <select className="w-full rounded-xl border border-ink/20 px-3 py-2" value={primaryPayer} onChange={(e) => setPrimaryPayerParticipantId(e.target.value)}>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>{participant.name}</option>
            ))}
          </select>

          {splitMode === 2 && (
            <div className="space-y-2 rounded-xl border border-ink/10 bg-white p-3">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm">{participant.name}</span>
                  <input
                    className="w-24 rounded-lg border border-ink/20 px-2 py-1"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={weights[participant.id] ?? "1"}
                    onChange={(event) => setWeights((current) => ({ ...current, [participant.id]: event.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}

          <button
            className="w-full rounded-xl bg-ink px-4 py-2 text-white disabled:opacity-60"
            disabled={!groupId || participants.length === 0 || createBillMutation.isPending}
            type="button"
            onClick={() => createBillMutation.mutate()}
          >
            {t("bills.save")}
          </button>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">{t("bills.title")}</h2>
        <div className="mt-4 space-y-2">
          {billsQuery.data?.map((bill) => (
            <div key={bill.id} className="rounded-xl border border-ink/10 bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{bill.storeName}</span>
                <span className="text-sm">{new Date(bill.transactionDateUtc).toLocaleDateString()}</span>
              </div>
              <div className="mt-2 text-sm text-ink/70">{t("bills.subtotal")}: RM {bill.subtotalAmount.toFixed(2)}</div>
              <div className="text-sm text-ink/70">{t("bills.fees")}: RM {bill.totalFeeAmount.toFixed(2)}</div>
              <div className="font-semibold">{t("bills.total")}: RM {bill.grandTotalAmount.toFixed(2)}</div>
            </div>
          ))}
          {(billsQuery.data?.length ?? 0) === 0 && <p className="text-sm text-ink/70">{t("bills.empty")}</p>}
        </div>
      </section>
    </div>
  );
}
