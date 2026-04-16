import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type BillDetailDto, type BillParticipantInput, type FeeType, type SplitMode } from "@api-client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { GroupStatusBadge, isGroupLocked } from "@/shared/groups/groupMeta";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { formatCurrency, formatDate, getErrorMessage } from "@/shared/utils/format";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { CustomMultiSelect, type CustomMultiSelectRef } from "@/shared/ui/CustomMultiSelect";
import { CustomSelect, type CustomSelectRef } from "@/shared/ui/CustomSelect";
import { ModalDialog } from "@/shared/ui/dialog";
import { EmptyState, IconActionButton, InlineMessage, LoadingSpinner, LoadingState, PageHeading, SectionCard, StatTile } from "@/shared/ui/primitives";
import { PencilIcon, PlusIcon, ReceiptIcon, TrashIcon, UsersIcon, WalletIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";

type BillFieldErrors = Partial<Record<"storeName" | "transactionDateUtc" | "feeName" | "feeValue" | "primaryPayer" | "weights" | "items", string>>;
type DraftItem = { id: string; description: string; amount: string; responsibleParticipantIds: string[] };
type DraftItemErrors = Record<string, { description?: string; amount?: string; responsible?: string }>;
type BillEditorStep = 1 | 2;

const createItem = (overrides?: Partial<DraftItem>): DraftItem => ({
  id: `item-${Math.random().toString(36).slice(2, 10)}`,
  description: "",
  amount: "",
  responsibleParticipantIds: [],
  ...overrides
});

const money = (value: string) => value.trim() === "" ? value : (Number.isFinite(Number(value)) ? Number(value).toFixed(2) : value);
const numeric = (value: string) => value.trim() === "" ? value : (Number.isFinite(Number(value)) ? String(Number(value)) : value);

export function BillsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { showToast } = useToast();

  const [storeName, setStoreName] = useState("");
  const [transactionDateUtc, setTransactionDateUtc] = useState("");
  const [splitMode, setSplitMode] = useState<SplitMode>(1);
  const [items, setItems] = useState<DraftItem[]>([createItem()]);
  const [feeName, setFeeName] = useState("");
  const [feeType, setFeeType] = useState<FeeType>(1);
  const [feeValue, setFeeValue] = useState("");
  const [primaryPayerParticipantId, setPrimaryPayerParticipantId] = useState("");
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<BillFieldErrors>({});
  const [itemErrors, setItemErrors] = useState<DraftItemErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorStep, setEditorStep] = useState<BillEditorStep>(1);
  const [loadingBillId, setLoadingBillId] = useState<string | null>(null);
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null);
  const [deleteBillError, setDeleteBillError] = useState<string | null>(null);

  const storeRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const feeNameRef = useRef<HTMLInputElement>(null);
  const feeValueRef = useRef<HTMLInputElement>(null);
  const payerRef = useRef<CustomSelectRef | null>(null);
  const itemDescRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const itemAmountRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const itemResponsibleRefs = useRef<Record<string, CustomMultiSelectRef | null>>({});
  const weightRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const participantsQuery = useQuery({
    queryKey: ["participants", groupId],
    queryFn: () => apiClient.listParticipants(groupId!),
    enabled: Boolean(groupId)
  });

  const groupQuery = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => apiClient.getGroup(groupId!),
    enabled: Boolean(groupId)
  });

  const billsQuery = useQuery({
    queryKey: ["bills", groupId],
    queryFn: () => apiClient.listBills(groupId!),
    enabled: Boolean(groupId)
  });

  const participants = participantsQuery.data ?? [];
  const isLocked = groupQuery.data ? isGroupLocked(groupQuery.data.status) : false;
  const canEditGroup = groupQuery.data?.canEdit ?? false;
  const isReadOnly = isLocked || !canEditGroup;
  const primaryPayer = primaryPayerParticipantId || participants[0]?.id || "";
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0), 0),
    [items]
  );
  const parsedFeeValue = feeValue.trim() === "" ? null : Number(feeValue);
  const estimatedFee = parsedFeeValue !== null && Number.isFinite(parsedFeeValue)
    ? (feeType === 1 ? (subtotal * parsedFeeValue) / 100 : parsedFeeValue)
    : 0;
  const estimatedTotal = subtotal + estimatedFee;
  const existingBillCount = billsQuery.data?.length ?? 0;

  useEffect(() => {
    if (!isEditorOpen) {
      return;
    }

    window.requestAnimationFrame(() => storeRef.current?.focus());
  }, [isEditorOpen]);

  const createBillMutation = useMutation({
    mutationFn: async () => apiClient.createBill(groupId!, buildBillPayload({
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
    })),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bills", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["settlements", groupId] })
      ]);
      closeEditor();
      showToast({ title: t("bills.create"), description: t("feedback.saved"), tone: "success" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : getErrorMessage(error);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bills", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["settlements", groupId] })
      ]);
      closeEditor();
      showToast({ title: t("bills.editTitle"), description: t("feedback.saved"), tone: "success" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : getErrorMessage(error);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
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
        closeEditor();
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
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });

    if (formError) {
      setFormError(null);
    }
  };

  const clearItemError = (itemId: string, field: "description" | "amount" | "responsible") => {
    setItemErrors((current) => {
      if (!current[itemId]?.[field]) {
        return current;
      }

      const next = { ...current };
      const nextItem = { ...next[itemId] };
      delete nextItem[field];
      if (Object.keys(nextItem).length === 0) {
        delete next[itemId];
      }
      else {
        next[itemId] = nextItem;
      }

      return next;
    });
    clearFieldError("items");
  };

  const fieldClass = (field: keyof BillFieldErrors, extra = "") =>
    ["input-base", fieldErrors[field] ? "border-danger focus:border-danger focus:ring-danger/10" : "", extra].filter(Boolean).join(" ");
  const itemClass = (itemId: string, field: "description" | "amount", extra = "") =>
    ["input-base", itemErrors[itemId]?.[field] ? "border-danger focus:border-danger focus:ring-danger/10" : "", extra].filter(Boolean).join(" ");

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
    else if (field === "items" && itemId && itemField === "responsible") {
      itemResponsibleRefs.current[itemId]?.focus();
    }
  };

  const resetBillDraft = () => {
    setStoreName("");
    setTransactionDateUtc("");
    setSplitMode(1);
    setItems([createItem()]);
    setFeeName("");
    setFeeType(1);
    setFeeValue("");
    setPrimaryPayerParticipantId("");
    setWeights({});
    setFieldErrors({});
    setItemErrors({});
    setFormError(null);
    setEditingBillId(null);
    setEditorStep(1);
  };

  const openCreateModal = () => {
    if (isReadOnly) {
      return;
    }

    resetBillDraft();
    setIsEditorOpen(true);
  };

  useEffect(() => {
    if (location.hash !== "#create-bill" || isEditorOpen || isReadOnly || participants.length === 0) {
      return;
    }

    openCreateModal();
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: ""
      },
      { replace: true }
    );
  }, [isEditorOpen, isReadOnly, location.hash, location.pathname, location.search, navigate, participants.length]);

  const closeEditor = () => {
    resetBillDraft();
    setIsEditorOpen(false);
    setLoadingBillId(null);
  };

  const addItem = () => {
    const nextItem = createItem();
    setItems((current) => [...current, nextItem]);
    window.requestAnimationFrame(() => itemDescRefs.current[nextItem.id]?.focus());
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((current) => current.length === 1 ? current : current.filter((item) => item.id !== itemId));
    setItemErrors((current) => {
      if (!current[itemId]) {
        return current;
      }

      const next = { ...current };
      delete next[itemId];
      return next;
    });
  };

  const formatFeeInput = () => {
    setFeeValue((current) => feeType === 1 ? numeric(current) : money(current));
  };

  async function handleEditBill(billId: string) {
    if (!groupId || isBillActionBusy || isReadOnly) {
      return;
    }

    try {
      setLoadingBillId(billId);
      const detail = await apiClient.getBill(groupId, billId);
      loadDraftFromBill(detail);
      setIsEditorOpen(true);
    }
    catch (error) {
      showToast({
        title: t("feedback.requestFailed"),
        description: error instanceof Error ? error.message : getErrorMessage(error),
        tone: "error"
      });
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
      amount: money(String(item.amount)),
      responsibleParticipantIds: item.responsibleParticipants.map((participant) => participant.participantId)
    })));

    const primaryFee = detail.fees[0];
    setFeeName(primaryFee?.name ?? "");
    setFeeType(primaryFee?.feeType ?? 1);
    setFeeValue(primaryFee ? numeric(String(primaryFee.value)) : "");
    setPrimaryPayerParticipantId(detail.primaryPayerParticipantId);
    setWeights(Object.fromEntries(detail.shares.map((share) => [share.participantId, numeric(String(share.weight))])));
    setFieldErrors({});
    setItemErrors({});
    setFormError(null);
    setEditorStep(1);
  }

  function validateBillDraft() {
    if (!groupId || isSubmitting || isReadOnly) {
      return false;
    }

    if (participants.length === 0) {
      const message = t("bills.noParticipantsBody");
      setFormError(message);
      showToast({ title: t("feedback.validationFailed"), description: message, tone: "error" });
      return false;
    }

    const nextErrors: BillFieldErrors = {};
    const nextItemErrors: DraftItemErrors = {};
    let firstField: keyof BillFieldErrors | null = null;
    let firstItemId: string | undefined;
    let firstPartId: string | undefined;
    let firstItemField: "description" | "amount" | "responsible" | undefined;

    const setInvalid = (field: keyof BillFieldErrors, message: string, partId?: string) => {
      if (!nextErrors[field]) {
        nextErrors[field] = message;
      }
      if (firstField === null) {
        firstField = field;
        firstPartId = partId;
      }
    };

    const setItemInvalid = (itemId: string, field: "description" | "amount" | "responsible", message: string) => {
      nextItemErrors[itemId] = { ...nextItemErrors[itemId], [field]: message };
      if (!nextErrors.items) {
        nextErrors.items = message;
      }
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

    if (parsedFeeValue !== null) {
      if (!Number.isFinite(parsedFeeValue) || parsedFeeValue < 0) setInvalid("feeValue", t("bills.feeInvalid"));
      if (parsedFeeValue > 0 && !feeName.trim()) setInvalid("feeName", t("bills.feeNameRequired"));
    }

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
      if (firstField !== null) {
        focusField(firstField, firstItemId, firstPartId, firstItemField);
      }
      return false;
    }

    setFieldErrors({});
    setItemErrors({});
    setFormError(null);
    return true;
  }

  function handleNextStep() {
    if (!validateBillDraft()) {
      return;
    }

    setEditorStep(2);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateBillDraft()) {
      return;
    }

    if (editingBillId) {
      updateBillMutation.mutate();
      return;
    }

    createBillMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <SectionCard className="p-6">
        <PageHeading
          eyebrow={groupQuery.data?.name ?? t("nav.bills")}
          title={t("bills.title")}
          description={t("bills.moduleBody")}
          actions={!isReadOnly ? (
            <button className="button-primary" disabled={isBillActionBusy} onClick={openCreateModal} type="button">
              <PlusIcon className="h-4 w-4" />
              {t("bills.create")}
            </button>
          ) : undefined}
        />

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatTile label={t("bills.savedCount")} value={String(existingBillCount).padStart(2, "0")} icon={<ReceiptIcon className="h-5 w-5" />} />
          <StatTile label={t("bills.draftItems")} value={String(items.length).padStart(2, "0")} icon={<UsersIcon className="h-5 w-5" />} tone="brand" />
          <StatTile label={t("bills.draftTotal")} value={formatCurrency(estimatedTotal)} icon={<WalletIcon className="h-5 w-5" />} tone="warning" />
          <StatTile label={t("participants.countLabel")} value={String(participants.length).padStart(2, "0")} icon={<UsersIcon className="h-5 w-5" />} tone="success" />
        </div>

        {groupQuery.data ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <GroupStatusBadge status={groupQuery.data.status} t={t} />
          </div>
        ) : null}

        {isReadOnly ? (
          <div className="mt-6">
            <InlineMessage tone="info">{canEditGroup ? t("groups.readOnlyBills") : t("groups.readOnlyMemberHint")}</InlineMessage>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard id="bill-history" className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">{t("bills.title")}</h2>
            <p className="mt-2 section-copy">{t("bills.listBody")}</p>
          </div>
          <span className="tag bg-mint text-success">
            {existingBillCount} {t("nav.bills")}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {billsQuery.isError ? (
            <InlineMessage
              tone="error"
              title={t("feedback.loadFailed")}
              action={<button className="button-secondary" onClick={() => billsQuery.refetch()} type="button">{t("common.retry")}</button>}
            >
              {getErrorMessage(billsQuery.error)}
            </InlineMessage>
          ) : billsQuery.isPending ? (
            <LoadingState lines={3} />
          ) : existingBillCount === 0 ? (
            <EmptyState
              icon={<ReceiptIcon className="h-6 w-6" />}
              title={t("bills.empty")}
              description={t("bills.emptyBody")}
              action={!isReadOnly ? <button className="button-secondary" onClick={openCreateModal} type="button">{t("bills.create")}</button> : undefined}
            />
          ) : (
            billsQuery.data?.map((bill) => (
              <article key={bill.id} className="list-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky text-brand">
                        <ReceiptIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-lg font-semibold tracking-tight text-ink">{bill.storeName}</div>
                        <div className="mt-1 text-sm text-muted">{formatDate(bill.transactionDateUtc)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="sm:text-right">
                      <div className="text-sm text-muted">{t("bills.total")}</div>
                      <div className="mt-1 text-2xl font-semibold tracking-tight text-ink">{formatCurrency(bill.grandTotalAmount)}</div>
                    </div>
                    {!isReadOnly ? (
                      <div className="flex gap-2">
                        <IconActionButton
                          icon={loadingBillId === bill.id ? <LoadingSpinner /> : <PencilIcon className="h-4 w-4" />}
                          label={t("bills.editAction")}
                          onClick={() => handleEditBill(bill.id)}
                          size="sm"
                          disabled={Boolean(loadingBillId) || isBillActionBusy}
                        />
                        <IconActionButton
                          className="text-danger hover:border-rose-200 hover:bg-rose-50 hover:text-danger"
                          icon={<TrashIcon className="h-4 w-4" />}
                          label={t("bills.deleteAction")}
                          onClick={() => {
                            setDeleteBillError(null);
                            setDeletingBillId(bill.id);
                          }}
                          size="sm"
                          disabled={Boolean(loadingBillId) || isBillActionBusy}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50/90 px-3 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("bills.subtotal")}</div>
                    <div className="mt-2 font-semibold text-ink">{formatCurrency(bill.subtotalAmount)}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50/90 px-3 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("bills.fees")}</div>
                    <div className="mt-2 font-semibold text-ink">{formatCurrency(bill.totalFeeAmount)}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50/90 px-3 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("bills.splitMode")}</div>
                    <div className="mt-2 font-semibold text-ink">{bill.splitMode === 2 ? t("bills.weighted") : t("bills.equal")}</div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </SectionCard>

      <ModalDialog
        open={isEditorOpen}
        title={editingBillId ? t("bills.editTitle") : t("bills.create")}
        description={editorStep === 1
          ? (editingBillId ? t("bills.editBody") : t("bills.modalBody"))
          : "Review the bill before saving it."
        }
        onClose={() => {
          if (!isSubmitting) {
            closeEditor();
          }
        }}
        className="max-w-6xl"
        actions={(
          <>
            <button className="button-secondary w-full sm:w-auto" disabled={isSubmitting} onClick={closeEditor} type="button">
              {t("common.cancel")}
            </button>
            {editorStep === 2 ? (
              <button className="button-secondary w-full sm:w-auto" disabled={isSubmitting} onClick={() => setEditorStep(1)} type="button">
                Back
              </button>
            ) : null}
            {editorStep === 1 ? (
              <button
                className="button-primary w-full sm:w-auto"
                disabled={!groupId || participants.length === 0 || isBillActionBusy}
                onClick={handleNextStep}
                type="button"
              >
                {t("bills.next")}
              </button>
            ) : (
              <button
                className="button-primary w-full sm:w-auto"
                disabled={!groupId || participants.length === 0 || isBillActionBusy}
                form="bill-editor-form"
                type="submit"
              >
                {isSubmitting ? <LoadingSpinner /> : null}
                {editingBillId ? t("bills.saveEdited") : t("bills.save")}
              </button>
            )}
          </>
        )}
      >
        <form id="bill-editor-form" className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={["rounded-[18px] border px-4 py-3", editorStep === 1 ? "border-ink/10 bg-ink text-white" : "border-slate-200 bg-slate-50 text-ink"].join(" ")}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">{t("bills.step1")}</div>
              <div className="mt-1 text-sm font-semibold">{t("bills.fillDetails")}</div>
            </div>
            <div className={["rounded-[18px] border px-4 py-3", editorStep === 2 ? "border-ink/10 bg-ink text-white" : "border-slate-200 bg-slate-50 text-ink"].join(" ")}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">{t("bills.step2")}</div>
              <div className="mt-1 text-sm font-semibold">{t("bills.reviewReceipt")}</div>
            </div>
          </div>

          {editorStep === 1 ? (
            <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">{t("bills.store")}</span>
                <input ref={storeRef} className={fieldClass("storeName")} value={storeName} onChange={(event) => { setStoreName(event.target.value); clearFieldError("storeName"); }} />
                {fieldErrors.storeName ? <p className="text-sm font-medium text-danger">{fieldErrors.storeName}</p> : null}
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">{t("bills.date")}</span>
                <input ref={dateRef} className={fieldClass("transactionDateUtc")} type="date" value={transactionDateUtc} onChange={(event) => { setTransactionDateUtc(event.target.value); clearFieldError("transactionDateUtc"); }} />
                {fieldErrors.transactionDateUtc ? <p className="text-sm font-medium text-danger">{fieldErrors.transactionDateUtc}</p> : null}
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">{t("bills.splitMode")}</span>
                <CustomSelect
                  ariaLabel={t("bills.splitMode")}
                  invalid={Boolean(fieldErrors.weights)}
                  options={[
                    { value: "1", label: t("bills.equal") },
                    { value: "2", label: t("bills.weighted") }
                  ]}
                  value={String(splitMode)}
                  onChange={(value) => {
                    setSplitMode(Number(value) as SplitMode);
                    clearFieldError("weights");
                  }}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">{t("bills.primaryPayer")}</span>
                <CustomSelect
                  ref={payerRef}
                  ariaLabel={t("bills.primaryPayer")}
                  invalid={Boolean(fieldErrors.primaryPayer)}
                  options={participants.map((participant) => ({
                    value: participant.id,
                    label: participant.name
                  }))}
                  value={primaryPayer}
                  onChange={(value) => {
                    setPrimaryPayerParticipantId(value);
                    clearFieldError("primaryPayer");
                  }}
                />
                {fieldErrors.primaryPayer ? <p className="text-sm font-medium text-danger">{fieldErrors.primaryPayer}</p> : null}
              </label>
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-ink">{t("bills.itemsSection")}</div>
                  <p className="mt-2 text-sm leading-6 text-muted">{t("bills.itemSplitHint")}</p>
                </div>
                <button className="button-secondary w-full sm:w-auto" onClick={addItem} type="button">
                  {t("bills.addItem")}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {items.map((item, index) => (
                  <article key={item.id} className="rounded-[20px] border border-slate-200 bg-white/92 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm font-semibold text-ink">{t("bills.item")} {String(index + 1).padStart(2, "0")}</div>
                      <button
                        className="button-pill w-full justify-center sm:w-auto"
                        disabled={items.length === 1 || isBillActionBusy}
                        onClick={() => handleRemoveItem(item.id)}
                        type="button"
                      >
                        {t("bills.removeItem")}
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[1.08fr,0.72fr,1.2fr]">
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-ink">{t("bills.item")}</span>
                        <input
                          ref={(element) => {
                            itemDescRefs.current[item.id] = element;
                          }}
                          className={itemClass(item.id, "description")}
                          value={item.description}
                          onChange={(event) => {
                            setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, description: event.target.value } : entry));
                            clearItemError(item.id, "description");
                          }}
                        />
                        {itemErrors[item.id]?.description ? <p className="text-sm font-medium text-danger">{itemErrors[item.id]?.description}</p> : null}
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-ink">{t("bills.amount")}</span>
                        <input
                          ref={(element) => {
                            itemAmountRefs.current[item.id] = element;
                          }}
                          className={itemClass(item.id, "amount", "text-right tabular-nums")}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={item.amount}
                          onBlur={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, amount: money(entry.amount) } : entry))}
                          onChange={(event) => {
                            setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, amount: event.target.value } : entry));
                            clearItemError(item.id, "amount");
                          }}
                        />
                        {itemErrors[item.id]?.amount ? <p className="text-sm font-medium text-danger">{itemErrors[item.id]?.amount}</p> : null}
                      </label>

                      <div className="space-y-2">
                        <span className="text-sm font-semibold text-ink">{t("bills.responsible")}</span>
                        <CustomMultiSelect
                          ref={(element) => {
                            itemResponsibleRefs.current[item.id] = element;
                          }}
                          ariaLabel={t("bills.responsible")}
                          invalid={Boolean(itemErrors[item.id]?.responsible)}
                          options={participants.map((participant) => ({
                            value: participant.id,
                            label: participant.name
                          }))}
                          value={item.responsibleParticipantIds}
                          onChange={(nextIds) => {
                            setItems((current) => current.map((entry) => entry.id === item.id
                              ? { ...entry, responsibleParticipantIds: nextIds }
                              : entry));
                            clearItemError(item.id, "responsible");
                          }}
                          placeholder={t("bills.responsiblePlaceholder")}
                        />
                        {itemErrors[item.id]?.responsible ? <p className="text-sm font-medium text-danger">{itemErrors[item.id]?.responsible}</p> : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {fieldErrors.items ? <p className="mt-3 text-sm font-medium text-danger">{fieldErrors.items}</p> : null}
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-ink">{t("bills.feeName")}</span>
                  <input ref={feeNameRef} className={fieldClass("feeName")} placeholder={t("bills.optionalPlaceholder")} value={feeName} onChange={(event) => { setFeeName(event.target.value); clearFieldError("feeName"); }} />
                  {fieldErrors.feeName ? <p className="text-sm font-medium text-danger">{fieldErrors.feeName}</p> : null}
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-ink">{t("bills.fees")}</span>
                  <CustomSelect
                    ariaLabel={t("bills.fees")}
                    options={[
                      { value: "1", label: t("bills.percentage") },
                      { value: "2", label: t("bills.fixed") }
                    ]}
                    value={String(feeType)}
                    onChange={(value) => {
                      setFeeType(Number(value) as FeeType);
                    }}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-ink">{t("bills.feeValue")}</span>
                  <input ref={feeValueRef} className={fieldClass("feeValue", "text-right tabular-nums")} type="number" inputMode="decimal" min="0" step="0.01" placeholder={t("bills.optionalPlaceholder")} value={feeValue} onBlur={formatFeeInput} onChange={(event) => { setFeeValue(event.target.value); clearFieldError("feeValue"); }} />
                  {fieldErrors.feeValue ? <p className="text-sm font-medium text-danger">{fieldErrors.feeValue}</p> : null}
                </label>
              </div>
              <div className="mt-3 text-sm leading-6 text-muted">{t("bills.feeOptionalHint")}</div>
            </div>

            {splitMode === 2 ? (
              <div className="rounded-[24px] border border-slate-200/80 bg-white/92 p-4 shadow-soft">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <UsersIcon className="h-4 w-4 text-brand" />
                  {t("bills.weightSettings")}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{t("bills.formHint")}</p>
                <div className="mt-4 space-y-3">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-3">
                      <span className="text-sm font-medium text-ink">{participant.name}</span>
                      <input
                        ref={(element) => {
                          weightRefs.current[participant.id] = element;
                        }}
                        className={fieldClass("weights", "w-28 text-right tabular-nums")}
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        step="0.01"
                        value={weights[participant.id] ?? "1"}
                        onBlur={(event) => setWeights((current) => ({ ...current, [participant.id]: numeric(event.target.value) }))}
                        onChange={(event) => {
                          setWeights((current) => ({ ...current, [participant.id]: event.target.value }));
                          clearFieldError("weights");
                        }}
                      />
                    </div>
                  ))}
                </div>
                {fieldErrors.weights ? <p className="mt-3 text-sm font-medium text-danger">{fieldErrors.weights}</p> : null}
              </div>
            ) : null}

            {participantsQuery.isError ? (
              <InlineMessage tone="error" title={t("feedback.loadFailed")} action={<button className="button-secondary" onClick={() => participantsQuery.refetch()} type="button">{t("common.retry")}</button>}>
                {getErrorMessage(participantsQuery.error)}
              </InlineMessage>
            ) : null}

            {formError ? <InlineMessage tone="error">{formError}</InlineMessage> : null}

            {participants.length === 0 ? (
              <EmptyState icon={<UsersIcon className="h-6 w-6" />} title={t("bills.noParticipantsTitle")} description={t("bills.noParticipantsBody")} action={groupId ? <Link className="button-secondary" to={`/groups/${groupId}/participants`}>{t("nav.participants")}</Link> : undefined} />
            ) : null}
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[0.78fr,1.22fr]">
              <section className="space-y-4">
                <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-4">
                  <div className="text-sm font-semibold text-ink">Bill summary</div>
                  <div className="mt-4 space-y-3">
                    <ReviewRow label={t("bills.store")} value={storeName.trim() || "-"} />
                    <ReviewRow label={t("bills.date")} value={transactionDateUtc ? formatDate(transactionDateUtc) : "-"} />
                    <ReviewRow
                      label={t("bills.primaryPayer")}
                      value={participants.find((participant) => participant.id === primaryPayer)?.name ?? "-"}
                    />
                    <ReviewRow
                      label={t("bills.splitMode")}
                      value={splitMode === 2 ? t("bills.weighted") : t("bills.equal")}
                    />
                    <ReviewRow label={t("bills.lineItems")} value={String(items.length)} />
                    <ReviewRow label={t("bills.total")} value={formatCurrency(estimatedTotal)} />
                  </div>
                </div>

                {formError ? <InlineMessage tone="error">{formError}</InlineMessage> : null}
              </section>

              <div className="space-y-4">
                <BillPreviewReceipt
                  estimatedFee={estimatedFee}
                  estimatedTotal={estimatedTotal}
                  feeName={feeName}
                  feeType={feeType}
                  feeValue={feeValue}
                  items={items}
                  participants={participants}
                  primaryPayerId={primaryPayer}
                  storeName={storeName}
                  subtotal={subtotal}
                  t={t}
                  transactionDateUtc={transactionDateUtc}
                />
              </div>
            </div>
          )}
        </form>
      </ModalDialog>

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

function BillPreviewReceipt({
  estimatedFee,
  estimatedTotal,
  feeName,
  feeType,
  feeValue,
  items,
  participants,
  primaryPayerId,
  storeName,
  subtotal,
  t,
  transactionDateUtc
}: {
  estimatedFee: number;
  estimatedTotal: number;
  feeName: string;
  feeType: FeeType;
  feeValue: string;
  items: DraftItem[];
  participants: Array<{ id: string; name: string }>;
  primaryPayerId: string;
  storeName: string;
  subtotal: number;
  t: (key: any) => string;
  transactionDateUtc: string;
}) {
  const payerName = participants.find((participant) => participant.id === primaryPayerId)?.name ?? t("bills.receiptNoPayer");
  const hasFee = feeValue.trim() !== "" && Number.isFinite(Number(feeValue)) && Number(feeValue) > 0;

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.88),rgba(255,255,255,0.98))] p-5 shadow-soft">
      <div className="flex items-center justify-between gap-4 border-b border-dashed border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{t("bills.preview")}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">{storeName.trim() || t("bills.receiptUntitled")}</div>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand shadow-soft">
          <ReceiptIcon className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <PreviewFact label={t("bills.date")} value={transactionDateUtc ? formatDate(transactionDateUtc) : t("bills.receiptEmptyDate")} />
        <PreviewFact label={t("bills.primaryPayer")} value={payerName} />
      </div>

      <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-white/90 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-ink">{t("bills.lineItems")}</div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{items.length} {t("bills.itemsShort")}</div>
        </div>

        <div className="mt-4 space-y-3">
          {items.every((item) => !item.description.trim() && !item.amount.trim()) ? (
            <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-muted">
              {t("bills.previewEmpty")}
            </div>
          ) : (
            items.map((item, index) => {
              const responsibleNames = participants
                .filter((participant) => item.responsibleParticipantIds.includes(participant.id))
                .map((participant) => participant.name);

              return (
                <article key={item.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50/90 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{t("bills.item")} {String(index + 1).padStart(2, "0")}</div>
                      <div className="mt-2 text-base font-semibold tracking-tight text-ink">{item.description.trim() || t("bills.receiptUnnamedItem")}</div>
                    </div>
                    <div className="text-right text-lg font-semibold tracking-tight text-ink">{formatCurrency(Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0)}</div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {responsibleNames.length > 0 ? (
                      responsibleNames.map((name) => <span key={`${item.id}-${name}`} className="tag bg-slate-100 text-muted">{name}</span>)
                    ) : (
                      <span className="text-sm text-muted">{t("bills.responsiblePlaceholder")}</span>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-white/92 px-4 py-4">
        <div className="space-y-3">
          <ReceiptRow label={t("bills.subtotal")} value={formatCurrency(subtotal)} />
          <ReceiptRow
            label={hasFee ? `${feeName.trim() || t("bills.fees")} · ${feeType === 1 ? `${feeValue}%` : formatCurrency(Number(feeValue))}` : t("bills.fees")}
            value={hasFee ? formatCurrency(estimatedFee) : t("bills.noFee")}
          />
          <div className="border-t border-dashed border-slate-200 pt-3">
            <ReceiptRow label={t("bills.total")} value={formatCurrency(estimatedTotal)} strong />
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewRow({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

function PreviewFact({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="mt-2 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function ReceiptRow({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={strong ? "text-sm font-semibold text-ink" : "text-sm text-muted"}>{label}</span>
      <span className={strong ? "text-lg font-semibold tracking-tight text-ink" : "text-sm font-semibold text-ink"}>{value}</span>
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
  const parsedFeeValue = feeValue.trim() === "" ? null : Number(feeValue);
  const fees = parsedFeeValue !== null && Number.isFinite(parsedFeeValue) && parsedFeeValue > 0
    ? [{ name: feeName.trim(), feeType, value: parsedFeeValue }]
    : [];
  const normalizedItems = items.map((item) => ({
    description: item.description.trim(),
    amount: Number(item.amount),
    responsibleParticipantIds: item.responsibleParticipantIds
  }));
  const activeParticipantIds = new Set<string>([primaryPayer]);
  for (const item of normalizedItems) {
    for (const participantId of item.responsibleParticipantIds) {
      activeParticipantIds.add(participantId);
    }
  }
  const billParticipants: BillParticipantInput[] = participants
    .filter((participant) => activeParticipantIds.has(participant.id))
    .map((participant) => ({
      participantId: participant.id,
      weight: splitMode === 2 ? Number(weights[participant.id] ?? "1") : null
    }));

  return {
    storeName: storeName.trim(),
    transactionDateUtc: new Date(transactionDateUtc).toISOString(),
    splitMode,
    primaryPayerParticipantId: primaryPayer,
    items: normalizedItems,
    fees,
    participants: billParticipants,
    extraContributions: []
  };
}
