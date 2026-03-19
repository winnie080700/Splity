import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type BillDetailDto, type BillParticipantInput, type FeeType, type SplitMode } from "@api-client";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { formatCurrency, formatDate, getErrorMessage } from "@/shared/utils/format";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { EmptyState, IconActionButton, InlineMessage, LoadingSpinner, LoadingState, PageHeading, SectionCard, StatTile } from "@/shared/ui/primitives";
import { CalendarIcon, PencilIcon, PlusIcon, ReceiptIcon, SparklesIcon, TrashIcon, UsersIcon, WalletIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";

type BillFieldErrors = Partial<Record<"storeName" | "transactionDateUtc" | "feeName" | "feeValue" | "primaryPayer" | "weights" | "items", string>>;
type DraftItem = { id: string; description: string; amount: string; responsibleParticipantIds: string[] };
type DraftItemErrors = Record<string, { description?: string; amount?: string; responsible?: string }>;

const createItem = (overrides?: Partial<DraftItem>): DraftItem => ({
  id: `item-${Math.random().toString(36).slice(2, 10)}`,
  description: "",
  amount: "",
  responsibleParticipantIds: [],
  ...overrides
});

const money = (value: string) => value.trim() === "" ? value : (Number.isFinite(Number(value)) ? Number(value).toFixed(2) : value);
const numeric = (value: string) => value.trim() === "" ? value : (Number.isFinite(Number(value)) ? String(Number(value)) : value);
const today = () => new Date().toISOString().slice(0, 10);

export function BillsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { showToast } = useToast();

  const [storeName, setStoreName] = useState("GrocerX");
  const [transactionDateUtc, setTransactionDateUtc] = useState(today);
  const [splitMode, setSplitMode] = useState<SplitMode>(1);
  const [items, setItems] = useState<DraftItem[]>([
    createItem({ description: "Groceries", amount: "80" }),
    createItem({ description: "Spaghetti", amount: "20" })
  ]);
  const [feeName, setFeeName] = useState("SST");
  const [feeType, setFeeType] = useState<FeeType>(1);
  const [feeValue, setFeeValue] = useState("6");
  const [primaryPayerParticipantId, setPrimaryPayerParticipantId] = useState("");
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<BillFieldErrors>({});
  const [itemErrors, setItemErrors] = useState<DraftItemErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [loadingBillId, setLoadingBillId] = useState<string | null>(null);
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null);
  const [deleteBillError, setDeleteBillError] = useState<string | null>(null);

  const storeRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const feeNameRef = useRef<HTMLInputElement>(null);
  const feeValueRef = useRef<HTMLInputElement>(null);
  const payerRef = useRef<HTMLSelectElement>(null);
  const itemDescRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const itemAmountRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const itemResponsibleRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const weightRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
  const primaryPayer = primaryPayerParticipantId || participants[0]?.id || "";
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0), 0),
    [items]
  );
  const feeValueNumber = Number(feeValue);
  const estimatedFee = Number.isFinite(feeValueNumber)
    ? (feeType === 1 ? (subtotal * feeValueNumber) / 100 : feeValueNumber)
    : 0;
  const estimatedTotal = subtotal + estimatedFee;

  const createBillMutation = useMutation({
    mutationFn: async () => {
      return apiClient.createBill(groupId!, buildBillPayload({
        feeName,
        feeType,
        feeValue,
        items,
        participants,
        primaryPayer,
        splitMode,
        storeName,
        transactionDateUtc,
        weights
      }));
    },
    onSuccess: async () => {
      resetBillDraft();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bills", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["settlements", groupId] })
      ]);
      showToast({ title: t("bills.create"), description: t("feedback.saved"), tone: "success" });
    },
    onError: (error) => showToast({ title: t("feedback.requestFailed"), description: error instanceof Error ? error.message : getErrorMessage(error), tone: "error" })
  });

  const updateBillMutation = useMutation({
    mutationFn: async () => {
      if (!editingBillId) {
        throw new Error(t("bills.editMissing"));
      }

      return apiClient.updateBill(groupId!, editingBillId, buildBillPayload({
        feeName,
        feeType,
        feeValue,
        items,
        participants,
        primaryPayer,
        splitMode,
        storeName,
        transactionDateUtc,
        weights
      }));
    },
    onSuccess: async () => {
      resetBillDraft();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bills", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["settlements", groupId] })
      ]);
      showToast({ title: t("bills.editTitle"), description: t("feedback.saved"), tone: "success" });
    },
    onError: (error) => showToast({ title: t("feedback.requestFailed"), description: error instanceof Error ? error.message : getErrorMessage(error), tone: "error" })
  });

  const deleteBillMutation = useMutation({
    mutationFn: async () => {
      if (!groupId || !deletingBillId) {
        throw new Error(t("bills.deleteMissing"));
      }

      return apiClient.deleteBill(groupId, deletingBillId);
    },
    onSuccess: async () => {
      if (!groupId || !deletingBillId) {
        return;
      }

      const deletedBillId = deletingBillId;
      if (editingBillId === deletedBillId) {
        resetBillDraft();
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bills", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["settlements", groupId] }),
        queryClient.removeQueries({ queryKey: ["bill", groupId, deletedBillId] })
      ]);
      setDeleteBillError(null);
      setDeletingBillId(null);
      showToast({ title: t("bills.deleteTitle"), description: t("feedback.deleted"), tone: "success" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : getErrorMessage(error);
      setDeleteBillError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  const isSubmitting = createBillMutation.isPending || updateBillMutation.isPending;
  const isBillActionBusy = isSubmitting || deleteBillMutation.isPending;

  const clearFieldError = (field: keyof BillFieldErrors) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    if (formError) setFormError(null);
  };

  const clearItemError = (itemId: string, field: "description" | "amount" | "responsible") => {
    setItemErrors((current) => {
      if (!current[itemId]?.[field]) return current;
      const next = { ...current };
      const nextItem = { ...next[itemId] };
      delete nextItem[field];
      if (Object.keys(nextItem).length === 0) delete next[itemId];
      else next[itemId] = nextItem;
      return next;
    });
    clearFieldError("items");
  };

  const fieldClass = (field: keyof BillFieldErrors, extra = "") =>
    ["input-base", fieldErrors[field] ? "border-danger focus:border-danger focus:ring-danger/10" : "", extra].filter(Boolean).join(" ");
  const itemClass = (itemId: string, field: "description" | "amount", extra = "") =>
    ["input-base", itemErrors[itemId]?.[field] ? "border-danger focus:border-danger focus:ring-danger/10" : "", extra].filter(Boolean).join(" ");
  const checkboxGroupClass = (itemId: string) =>
    [
      "rounded-[20px] border bg-white p-3 transition-colors",
      itemErrors[itemId]?.responsible ? "border-danger" : "border-slate-200"
    ].join(" ");

  const focusField = (
    field: keyof BillFieldErrors,
    itemId?: string,
    partId?: string,
    itemField?: "description" | "amount" | "responsible"
  ) => {
    if (field === "storeName") storeRef.current?.focus();
    else if (field === "transactionDateUtc") dateRef.current?.focus();
    else if (field === "feeName") feeNameRef.current?.focus();
    else if (field === "feeValue") feeValueRef.current?.focus();
    else if (field === "primaryPayer") payerRef.current?.focus();
    else if (field === "weights" && partId) weightRefs.current[partId]?.focus();
    else if (field === "items" && itemId && itemField === "description") itemDescRefs.current[itemId]?.focus();
    else if (field === "items" && itemId && itemField === "amount") itemAmountRefs.current[itemId]?.focus();
    else if (field === "items" && itemId && itemField === "responsible") itemResponsibleRefs.current[itemId]?.focus();
  };

  const addItem = () => {
    const nextItem = createItem();
    setItems((current) => [...current, nextItem]);
    window.requestAnimationFrame(() => itemDescRefs.current[nextItem.id]?.focus());
  };

  const resetBillDraft = () => {
    setStoreName("");
    setTransactionDateUtc(today());
    setSplitMode(1);
    setItems([createItem()]);
    setFeeName("");
    setFeeType(1);
    setFeeValue("0");
    setPrimaryPayerParticipantId("");
    setWeights({});
    setFieldErrors({});
    setItemErrors({});
    setFormError(null);
    setEditingBillId(null);
    setLoadingBillId(null);
    window.requestAnimationFrame(() => storeRef.current?.focus());
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.id !== itemId)));
    setItemErrors((current) => {
      if (!current[itemId]) return current;
      const next = { ...current };
      delete next[itemId];
      return next;
    });
  };

  const toggleResponsibleParticipant = (itemId: string, participantId: string) => {
    setItems((current) => current.map((item) => {
      if (item.id !== itemId) return item;
      const isSelected = item.responsibleParticipantIds.includes(participantId);
      return {
        ...item,
        responsibleParticipantIds: isSelected
          ? item.responsibleParticipantIds.filter((id) => id !== participantId)
          : [...item.responsibleParticipantIds, participantId]
      };
    }));
    clearItemError(itemId, "responsible");
  };

  async function handleEditBill(billId: string) {
    if (!groupId || isBillActionBusy) {
      return;
    }

    try {
      setLoadingBillId(billId);
      const detail = await apiClient.getBill(groupId, billId);
      loadDraftFromBill(detail);
      document.getElementById("create-bill")?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.requestAnimationFrame(() => storeRef.current?.focus());
    }
    catch (error) {
      showToast({ title: t("feedback.requestFailed"), description: error instanceof Error ? error.message : getErrorMessage(error), tone: "error" });
    }
    finally {
      setLoadingBillId(null);
    }
  }

  function loadDraftFromBill(detail: BillDetailDto) {
    setEditingBillId(detail.id);
    setStoreName(detail.storeName);
    setTransactionDateUtc(new Date(detail.transactionDateUtc).toISOString().slice(0, 10));
    setSplitMode(detail.splitMode);
    setItems(detail.items.map((item) => ({
      id: item.id,
      description: item.description,
      amount: item.amount.toFixed(2),
      responsibleParticipantIds: item.responsibleParticipants.map((participant) => participant.participantId)
    })));

    const primaryFee = detail.fees[0];
    setFeeName(primaryFee?.name ?? "");
    setFeeType(primaryFee?.feeType ?? 1);
    setFeeValue(primaryFee ? primaryFee.value.toFixed(2) : "0");
    setPrimaryPayerParticipantId(detail.primaryPayerParticipantId);
    setWeights(Object.fromEntries(detail.shares.map((share) => [share.participantId, String(share.weight)])));
    setFieldErrors({});
    setItemErrors({});
    setFormError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupId || isSubmitting) return;

    if (participants.length === 0) {
      setFormError(t("bills.noParticipantsBody"));
      showToast({ title: t("feedback.validationFailed"), description: t("bills.noParticipantsBody"), tone: "error" });
      return;
    }

    const nextErrors: BillFieldErrors = {};
    const nextItemErrors: DraftItemErrors = {};
    let firstField: keyof BillFieldErrors | null = null;
    let firstItemId: string | undefined;
    let firstPartId: string | undefined;
    let firstItemField: "description" | "amount" | "responsible" | undefined;

    const setInvalid = (field: keyof BillFieldErrors, message: string, partId?: string) => {
      if (!nextErrors[field]) nextErrors[field] = message;
      if (firstField === null) {
        firstField = field;
        firstPartId = partId;
      }
    };

    const setItemInvalid = (itemId: string, field: "description" | "amount" | "responsible", message: string) => {
      nextItemErrors[itemId] = { ...nextItemErrors[itemId], [field]: message };
      if (!nextErrors.items) nextErrors.items = message;
      if (firstField === null) {
        firstField = "items";
        firstItemId = itemId;
        firstItemField = field;
      }
    };

    if (!storeName.trim()) setInvalid("storeName", t("bills.storeRequired"));
    if (!transactionDateUtc || Number.isNaN(new Date(transactionDateUtc).getTime())) setInvalid("transactionDateUtc", t("bills.dateRequired"));
    if (items.length === 0) setInvalid("items", t("bills.itemsRequired"));

    for (const item of items) {
      if (!item.description.trim()) setItemInvalid(item.id, "description", t("bills.itemRequired"));
      const amount = Number(item.amount);
      if (!Number.isFinite(amount) || amount <= 0) setItemInvalid(item.id, "amount", t("bills.amountInvalid"));
      if (item.responsibleParticipantIds.length === 0) setItemInvalid(item.id, "responsible", t("bills.responsibleRequired"));
    }

    if (!Number.isFinite(feeValueNumber) || feeValueNumber < 0) setInvalid("feeValue", t("bills.feeInvalid"));
    if ((Number.isFinite(feeValueNumber) ? feeValueNumber : 0) > 0 && !feeName.trim()) setInvalid("feeName", t("bills.feeNameRequired"));
    if (!primaryPayer) setInvalid("primaryPayer", t("bills.payerRequired"));

    if (splitMode === 2) {
      for (const participant of participants) {
        const weightValue = Number(weights[participant.id] ?? "1");
        if (!Number.isFinite(weightValue) || weightValue <= 0) {
          setInvalid("weights", t("bills.weightInvalid"), participant.id);
          break;
        }
      }
    }

    if (Object.keys(nextErrors).length > 0 || Object.keys(nextItemErrors).length > 0) {
      const message = nextErrors.items ?? Object.values(nextErrors)[0] ?? t("feedback.validationFailed");
      setFieldErrors(nextErrors);
      setItemErrors(nextItemErrors);
      setFormError(message);
      showToast({ title: t("feedback.validationFailed"), description: message, tone: "error" });
      if (firstField !== null) focusField(firstField, firstItemId, firstPartId, firstItemField);
      return;
    }

    setFieldErrors({});
    setItemErrors({});
    setFormError(null);

    if (editingBillId) {
      updateBillMutation.mutate();
      return;
    }

    createBillMutation.mutate();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr] 2xl:grid-cols-[1.16fr,0.84fr]">
      <SectionCard id="create-bill" className="p-6">
        <PageHeading
          eyebrow={t("nav.bills")}
          title={editingBillId ? t("bills.editTitle") : t("bills.create")}
          description={editingBillId ? t("bills.editBody") : t("bills.subtitle")}
          actions={(
            <div className="flex items-center gap-2">
              {editingBillId ? (
                <button className="button-secondary" disabled={isBillActionBusy} onClick={resetBillDraft} type="button">
                  {t("bills.cancelEdit")}
                </button>
              ) : null}
              <IconActionButton
                icon={<PlusIcon className="h-4 w-4" />}
                label={t("bills.createNew")}
                onClick={resetBillDraft}
                disabled={isBillActionBusy}
                variant="primary"
              />
            </div>
          )}
        />
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <StatTile label={t("bills.lineItems")} value={String(items.length).padStart(2, "0")} icon={<ReceiptIcon className="h-5 w-5" />} />
          <StatTile label={t("bills.subtotal")} value={formatCurrency(subtotal)} icon={<ReceiptIcon className="h-5 w-5" />} />
          <StatTile label={t("bills.fees")} value={formatCurrency(estimatedFee)} icon={<SparklesIcon className="h-5 w-5" />} tone="warning" />
          <StatTile label={t("bills.total")} value={formatCurrency(estimatedTotal)} icon={<WalletIcon className="h-5 w-5" />} tone="brand" />
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">{t("bills.store")}</span>
              <input ref={storeRef} className={fieldClass("storeName")} value={storeName} onChange={(e) => { setStoreName(e.target.value); clearFieldError("storeName"); }} />
              {fieldErrors.storeName ? <p className="text-sm font-medium text-danger">{fieldErrors.storeName}</p> : null}
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">{t("bills.date")}</span>
              <input ref={dateRef} className={fieldClass("transactionDateUtc")} type="date" value={transactionDateUtc} onChange={(e) => { setTransactionDateUtc(e.target.value); clearFieldError("transactionDateUtc"); }} />
              {fieldErrors.transactionDateUtc ? <p className="text-sm font-medium text-danger">{fieldErrors.transactionDateUtc}</p> : null}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">{t("bills.splitMode")}</span>
              <select className={fieldClass("weights")} value={splitMode} onChange={(e) => { setSplitMode(Number(e.target.value) as SplitMode); clearFieldError("weights"); }}>
                <option value={1}>{t("bills.equal")}</option>
                <option value={2}>{t("bills.weighted")}</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">{t("bills.primaryPayer")}</span>
              <select ref={payerRef} className={fieldClass("primaryPayer")} value={primaryPayer} onChange={(e) => { setPrimaryPayerParticipantId(e.target.value); clearFieldError("primaryPayer"); }}>
                {participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}
              </select>
              {fieldErrors.primaryPayer ? <p className="text-sm font-medium text-danger">{fieldErrors.primaryPayer}</p> : null}
            </label>
          </div>

          <div className="surface-muted p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-ink">{t("bills.itemsSection")}</div>
                <p className="mt-2 text-sm leading-6 text-muted">{t("bills.itemSplitHint")}</p>
              </div>
              <IconActionButton
                icon={<PlusIcon className="h-4 w-4" />}
                label={t("bills.addItem")}
                onClick={addItem}
                size="sm"
              />
            </div>
            <div className="mt-4 space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="rounded-[22px] border border-slate-200 bg-white/90 p-4 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-ink">{t("bills.item")} {String(index + 1).padStart(2, "0")}</div>
                    <button className="button-pill" disabled={items.length === 1 || isBillActionBusy} onClick={() => handleRemoveItem(item.id)} type="button">{t("bills.removeItem")}</button>
                  </div>
                  <div className="mt-4 grid gap-4 xl:grid-cols-[1.12fr,0.72fr,1.48fr]">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-ink">{t("bills.item")}</span>
                      <input
                        ref={(element) => { itemDescRefs.current[item.id] = element; }}
                        className={itemClass(item.id, "description")}
                        value={item.description}
                        onChange={(e) => {
                          setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, description: e.target.value } : entry));
                          clearItemError(item.id, "description");
                        }}
                      />
                      {itemErrors[item.id]?.description ? <p className="text-sm font-medium text-danger">{itemErrors[item.id]?.description}</p> : null}
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-ink">{t("bills.amount")}</span>
                      <input
                        ref={(element) => { itemAmountRefs.current[item.id] = element; }}
                        className={itemClass(item.id, "amount", "text-right tabular-nums")}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={item.amount}
                        onBlur={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, amount: money(entry.amount) } : entry))}
                        onChange={(e) => {
                          setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, amount: e.target.value } : entry));
                          clearItemError(item.id, "amount");
                        }}
                      />
                      {itemErrors[item.id]?.amount ? <p className="text-sm font-medium text-danger">{itemErrors[item.id]?.amount}</p> : null}
                    </label>
                    <div className="space-y-2">
                      <span className="text-sm font-semibold text-ink">{t("bills.responsible")}</span>
                      <div className={checkboxGroupClass(item.id)}>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {participants.map((participant, participantIndex) => {
                            const checked = item.responsibleParticipantIds.includes(participant.id);
                            return (
                              <label
                                key={participant.id}
                                className={[
                                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-sm font-medium transition-all",
                                  checked
                                    ? "border-brand bg-sky text-ink shadow-soft"
                                    : "border-slate-200 bg-white text-muted hover:border-slate-300 hover:text-ink"
                                ].join(" ")}
                              >
                                <input
                                  ref={(element) => {
                                    if (participantIndex === 0) itemResponsibleRefs.current[item.id] = element;
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/20"
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleResponsibleParticipant(item.id, participant.id)}
                                />
                                <span className="leading-5">{participant.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      {itemErrors[item.id]?.responsible ? <p className="text-sm font-medium text-danger">{itemErrors[item.id]?.responsible}</p> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {fieldErrors.items ? <p className="mt-3 text-sm font-medium text-danger">{fieldErrors.items}</p> : null}
          </div>

          <div className="surface-muted p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">{t("bills.feeName")}</span>
                <input ref={feeNameRef} className={fieldClass("feeName")} value={feeName} onChange={(e) => { setFeeName(e.target.value); clearFieldError("feeName"); }} />
                {fieldErrors.feeName ? <p className="text-sm font-medium text-danger">{fieldErrors.feeName}</p> : null}
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">{t("bills.fees")}</span>
                <select className="input-base" value={feeType} onChange={(e) => setFeeType(Number(e.target.value) as FeeType)}>
                  <option value={1}>{t("bills.percentage")}</option>
                  <option value={2}>{t("bills.fixed")}</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">{t("bills.feeValue")}</span>
                <input
                  ref={feeValueRef}
                  className={fieldClass("feeValue", "text-right tabular-nums")}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={feeValue}
                  onBlur={() => setFeeValue((current) => money(current))}
                  onChange={(e) => { setFeeValue(e.target.value); clearFieldError("feeValue"); }}
                />
                {fieldErrors.feeValue ? <p className="text-sm font-medium text-danger">{fieldErrors.feeValue}</p> : null}
              </label>
            </div>
          </div>

          {splitMode === 2 ? (
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink"><UsersIcon className="h-4 w-4 text-brand" />{t("bills.weightSettings")}</div>
              <p className="mt-2 text-sm leading-6 text-muted">{t("bills.formHint")}</p>
              <div className="mt-4 space-y-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-3">
                    <span className="text-sm font-medium text-ink">{participant.name}</span>
                    <input
                      ref={(element) => { weightRefs.current[participant.id] = element; }}
                      className={fieldClass("weights", "w-28 text-right tabular-nums")}
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      value={weights[participant.id] ?? "1"}
                      onBlur={(e) => setWeights((current) => ({ ...current, [participant.id]: numeric(e.target.value) }))}
                      onChange={(e) => {
                        setWeights((current) => ({ ...current, [participant.id]: e.target.value }));
                        clearFieldError("weights");
                      }}
                    />
                  </div>
                ))}
              </div>
              {fieldErrors.weights ? <p className="mt-3 text-sm font-medium text-danger">{fieldErrors.weights}</p> : null}
            </div>
          ) : null}

          {participantsQuery.isError ? <InlineMessage tone="error" title={t("feedback.loadFailed")} action={<button className="button-secondary" onClick={() => participantsQuery.refetch()} type="button">{t("common.retry")}</button>}>{getErrorMessage(participantsQuery.error)}</InlineMessage> : null}
          {formError ? <InlineMessage tone="error">{formError}</InlineMessage> : null}
          {participants.length === 0 ? <EmptyState icon={<UsersIcon className="h-6 w-6" />} title={t("bills.noParticipantsTitle")} description={t("bills.noParticipantsBody")} action={groupId ? <Link className="button-secondary" to={`/groups/${groupId}/participants#add-participant`}>{t("nav.participants")}</Link> : undefined} /> : null}
          <div className="flex justify-end">
            <IconActionButton
              disabled={!groupId || participants.length === 0 || isBillActionBusy}
              icon={isSubmitting ? <LoadingSpinner /> : editingBillId ? <PencilIcon className="h-4 w-4" /> : <ReceiptIcon className="h-4 w-4" />}
              label={isSubmitting ? `${t("common.processing")}...` : editingBillId ? t("common.saveChanges") : t("bills.save")}
              type="submit"
              variant="primary"
            />
          </div>
        </form>
      </SectionCard>

      <div className="space-y-6">
        <SectionCard className="p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div><h2 className="section-title">{t("bills.preview")}</h2><p className="mt-2 section-copy">{t("bills.itemSplitHint")}</p></div>
            <span className="tag bg-sky text-brand"><CalendarIcon className="mr-1 h-3.5 w-3.5" />{transactionDateUtc}</span>
          </div>
          <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(37,99,235,0.06),rgba(255,255,255,0.95))] p-5">
            <div className="flex items-center justify-between gap-4">
              <div><div className="text-sm font-medium text-muted">{storeName}</div><div className="mt-1 text-3xl font-semibold tracking-tight text-ink">{formatCurrency(estimatedTotal)}</div></div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand shadow-soft"><WalletIcon className="h-5 w-5" /></span>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {items.map((item, index) => {
              const responsibleNames = participants
                .filter((participant) => item.responsibleParticipantIds.includes(participant.id))
                .map((participant) => participant.name);
              return (
                <div key={item.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50/90 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">{t("bills.item")} {String(index + 1).padStart(2, "0")}</div>
                      <div className="mt-2 text-base font-semibold tracking-tight text-ink">{item.description.trim() || t("bills.item")}</div>
                      <div className="mt-1 text-sm text-muted">{t("bills.responsible")}: {responsibleNames.length > 0 ? responsibleNames.join(", ") : t("bills.responsibleRequired")}</div>
                    </div>
                    <div className="text-right text-lg font-semibold tracking-tight text-ink">{formatCurrency(Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard id="bill-history" className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="section-title">{t("bills.title")}</h2><p className="mt-2 section-copy">{t("bills.subtitle")}</p></div><span className="tag bg-mint text-success">{billsQuery.data?.length ?? 0} {t("nav.bills")}</span></div>
          <div className="mt-5 space-y-3">
            {billsQuery.isError ? <InlineMessage tone="error" title={t("feedback.loadFailed")} action={<button className="button-secondary" onClick={() => billsQuery.refetch()} type="button">{t("common.retry")}</button>}>{getErrorMessage(billsQuery.error)}</InlineMessage> : billsQuery.isPending ? <LoadingState lines={3} /> : (billsQuery.data?.length ?? 0) === 0 ? <EmptyState icon={<ReceiptIcon className="h-6 w-6" />} title={t("bills.empty")} description={t("bills.emptyBody")} action={<button className="button-secondary" onClick={() => storeRef.current?.focus()} type="button">{t("common.focusInput")}</button>} /> : billsQuery.data?.map((bill) => <article key={bill.id} className="list-card"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky text-brand"><ReceiptIcon className="h-4 w-4" /></span><div><div className="text-lg font-semibold tracking-tight text-ink">{bill.storeName}</div><div className="mt-1 text-sm text-muted">{formatDate(bill.transactionDateUtc)}</div></div></div></div><div className="flex items-start gap-3"><div className="text-right"><div className="text-sm text-muted">{t("bills.total")}</div><div className="mt-1 text-2xl font-semibold tracking-tight text-ink">{formatCurrency(bill.grandTotalAmount)}</div></div><IconActionButton icon={loadingBillId === bill.id ? <LoadingSpinner /> : <PencilIcon className="h-4 w-4" />} label={t("bills.editAction")} onClick={() => handleEditBill(bill.id)} size="sm" disabled={Boolean(loadingBillId) || isBillActionBusy} /><IconActionButton className="text-danger hover:border-rose-200 hover:bg-rose-50 hover:text-danger" icon={<TrashIcon className="h-4 w-4" />} label={t("bills.deleteAction")} onClick={() => { setDeleteBillError(null); setDeletingBillId(bill.id); }} size="sm" disabled={Boolean(loadingBillId) || isBillActionBusy} /></div></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50/90 px-3 py-3"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("bills.subtotal")}</div><div className="mt-2 font-semibold text-ink">{formatCurrency(bill.subtotalAmount)}</div></div><div className="rounded-2xl bg-slate-50/90 px-3 py-3"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("bills.fees")}</div><div className="mt-2 font-semibold text-ink">{formatCurrency(bill.totalFeeAmount)}</div></div><div className="rounded-2xl bg-slate-50/90 px-3 py-3"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("bills.splitMode")}</div><div className="mt-2 font-semibold text-ink">{bill.splitMode === 2 ? t("bills.weighted") : t("bills.equal")}</div></div></div></article>)}
          </div>
        </SectionCard>
      </div>
      <ConfirmDialog
        open={Boolean(deletingBillId)}
        title={t("bills.deleteTitle")}
        description={t("bills.deleteBody")}
        details={(billsQuery.data ?? []).find((bill) => bill.id === deletingBillId)?.storeName ?? ""}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("common.delete")}
        error={deleteBillError}
        isBusy={deleteBillMutation.isPending}
        onClose={() => {
          setDeleteBillError(null);
          setDeletingBillId(null);
        }}
        onConfirm={() => deleteBillMutation.mutate()}
      />
    </div>
  );
}

function buildBillPayload({
  feeName,
  feeType,
  feeValue,
  items,
  participants,
  primaryPayer,
  splitMode,
  storeName,
  transactionDateUtc,
  weights
}: {
  feeName: string;
  feeType: FeeType;
  feeValue: string;
  items: DraftItem[];
  participants: Array<{ id: string }>;
  primaryPayer: string;
  splitMode: SplitMode;
  storeName: string;
  transactionDateUtc: string;
  weights: Record<string, string>;
}) {
  const billParticipants: BillParticipantInput[] = participants.map((participant) => ({
    participantId: participant.id,
    weight: splitMode === 2 ? Number(weights[participant.id] ?? "1") : null
  }));

  return {
    storeName: storeName.trim(),
    transactionDateUtc: new Date(transactionDateUtc).toISOString(),
    splitMode,
    primaryPayerParticipantId: primaryPayer,
    items: items.map((item) => ({
      description: item.description.trim(),
      amount: Number(item.amount),
      responsibleParticipantIds: item.responsibleParticipantIds
    })),
    fees: [{ name: feeName.trim(), feeType, value: Number(feeValue) }],
    participants: billParticipants,
    extraContributions: []
  };
}
