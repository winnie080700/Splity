import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiClient,
  type BillDetailDto,
  type BillFeeInput,
  type BillItemInput,
  type BillParticipantInput,
  type CreateBillRequest,
  type FeeType,
  type ParticipantInvitationStatus,
  type SplitMode
} from "@api-client";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { buildSettlementReceiptData } from "@/features/settlements/receipt";
import { SettlementReceiptBreakdown } from "@/features/settlements/SettlementReceiptBreakdown";
import { prepareSettlementProofImageDataUrl } from "@/features/settlements/share";
import { SETTLEMENT_STATUS, isSettlementPaid, isSettlementUnpaid } from "@/features/settlements/status";
import { downloadAllReceiptsImage, downloadReceiptImage } from "@/features/settlements/summaryImage";
import { SettlementShareDialog } from "@/features/settlements/SettlementShareDialog";
import { useAuth } from "@/shared/auth/AuthProvider";
import { formatGroupCreatedAt, GroupStatusBadge, isGroupLocked } from "@/shared/groups/groupMeta";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { CustomMultiSelect } from "@/shared/ui/CustomMultiSelect";
import { CustomSelect } from "@/shared/ui/CustomSelect";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { EditNameDialog } from "@/shared/ui/EditNameDialog";
import { ModalDialog } from "@/shared/ui/dialog";
import {
  EmptyState,
  IconActionButton,
  InlineMessage,
  LoadingSpinner,
  LoadingState,
  SectionCard,
  StatTile
} from "@/shared/ui/primitives";
import {
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  DownloadIcon,
  EyeIcon,
  ExportIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  TrashIcon,
  UsersIcon
} from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";
import { formatCurrency, formatDate, getErrorMessage } from "@/shared/utils/format";

type DraftEntry = { id: string; name: string; username?: string | null; isInvite: boolean };
type DraftItem = { id: string; description: string; amount: string; responsibleParticipantIds: string[] };
type DraftFee = { id: string; name: string; feeType: FeeType; value: string };
type BillFieldErrors = Partial<Record<"storeName" | "transactionDateUtc" | "primaryPayer" | "items" | "weights" | "fees", string>>;
type DraftItemErrors = Record<string, { description?: string; amount?: string; responsible?: string }>;
type DraftFeeErrors = Record<string, { name?: string; value?: string }>;
type FeeRowState = "blank" | "complete" | "partial";
type BillModalMode = "create" | "edit";
type BillPreviewItemParticipant = { participantId: string; participantName: string };
type BillPreviewItem = { id: string; description: string; amount: number; responsibleParticipants: BillPreviewItemParticipant[] };
type BillPreviewFee = { id: string; name: string; feeType: FeeType; value: number; appliedAmount: number };
type BillPreviewData = {
  storeName: string;
  transactionDateUtc: string;
  primaryPayerName: string;
  referenceImageDataUrl: string;
  items: BillPreviewItem[];
  fees: BillPreviewFee[];
  subtotalAmount: number;
  totalFeeAmount: number;
  grandTotalAmount: number;
};

const createItem = (): DraftItem => ({
  id: `item-${Math.random().toString(36).slice(2, 10)}`,
  description: "",
  amount: "",
  responsibleParticipantIds: []
});

const createFee = (): DraftFee => ({
  id: `fee-${Math.random().toString(36).slice(2, 10)}`,
  name: "",
  feeType: 1,
  value: ""
});

function getFeeRowState(fee: DraftFee): FeeRowState {
  const name = fee.name.trim();
  const rawValue = fee.value.trim();
  const parsedValue = rawValue === "" ? null : Number(rawValue);
  const isZero = parsedValue !== null && Number.isFinite(parsedValue) && parsedValue === 0;

  if (name === "" && (rawValue === "" || isZero)) {
    return "blank";
  }

  if (name !== "" && parsedValue !== null && Number.isFinite(parsedValue) && parsedValue > 0) {
    return "complete";
  }

  return "partial";
}

function getParticipantHandle(name: string, username?: string | null) {
  if (username?.trim()) {
    return `@${username.trim()}`;
  }

  return `@${name.trim().toLowerCase().replace(/\s+/g, "")}`;
}

function getParticipantInvitationMeta(status: ParticipantInvitationStatus) {
  switch (status) {
    case "pending":
      return { labelKey: "participants.statusInvited", className: "border border-brand/10 bg-brand/5 text-brand" };
    case "declined":
      return { labelKey: "participants.statusDeclined", className: "border border-danger/20 bg-rose-50 text-danger" };
    case "accepted":
      return { labelKey: "participants.statusAccepted", className: "border border-mint/60 bg-mint/70 text-success" };
    default:
      return { labelKey: "participants.statusManual", className: "bg-slate-100 text-muted" };
  }
}

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const queryClient = useQueryClient();
  const { isGuest } = useAuth();
  const { t, language } = useI18n();
  const { showToast } = useToast();

  const [draftEntries, setDraftEntries] = useState<DraftEntry[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingParticipantId, setDeletingParticipantId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isBillEditorOpen, setIsBillEditorOpen] = useState(false);
  const [billModalMode, setBillModalMode] = useState<BillModalMode>("create");
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [viewingBillId, setViewingBillId] = useState<string | null>(null);
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null);
  const [deleteBillError, setDeleteBillError] = useState<string | null>(null);
  const [settlementReceiptParticipantId, setSettlementReceiptParticipantId] = useState<string | null>(null);
  const [downloadingReceiptIds, setDownloadingReceiptIds] = useState<Set<string>>(new Set());
  const [isExportingAllReceipts, setIsExportingAllReceipts] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isStartSettlementOpen, setIsStartSettlementOpen] = useState(false);
  const [isMarkSettledOpen, setIsMarkSettledOpen] = useState(false);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [referenceImageDataUrl, setReferenceImageDataUrl] = useState("");
  const [transactionDateUtc, setTransactionDateUtc] = useState("");
  const [splitMode, setSplitMode] = useState<SplitMode>(1);
  const [primaryPayerParticipantId, setPrimaryPayerParticipantId] = useState("");
  const [billItems, setBillItems] = useState<DraftItem[]>([createItem()]);
  const [billFees, setBillFees] = useState<DraftFee[]>([]);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [billFieldErrors, setBillFieldErrors] = useState<BillFieldErrors>({});
  const [billItemErrors, setBillItemErrors] = useState<DraftItemErrors>({});
  const [billFeeErrors, setBillFeeErrors] = useState<DraftFeeErrors>({});
  const [billFormError, setBillFormError] = useState<string | null>(null);
  const referenceInputRef = useRef<HTMLInputElement | null>(null);

  const searchedUsername = inputValue.trim().startsWith("@")
    ? inputValue.trim().replace(/^@+/, "").trim().toLowerCase()
    : "";

  const groupQuery = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => apiClient.getGroup(groupId!),
    enabled: Boolean(groupId)
  });

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

  const settlementQuery = useQuery({
    queryKey: ["settlements", groupId],
    queryFn: () => apiClient.getSettlements(groupId!),
    enabled: Boolean(groupId)
  });

  const currentShareQuery = useQuery({
    queryKey: ["current-settlement-share", groupId],
    queryFn: () => apiClient.getCurrentSettlementShare(groupId!),
    enabled: Boolean(groupId),
    retry: false
  });

  const searchedUserQuery = useQuery({
    queryKey: ["user-search", searchedUsername],
    queryFn: () => apiClient.searchUserByUsername(searchedUsername),
    enabled: isCreateDialogOpen && searchedUsername.length >= 3
  });

  const viewingBillQuery = useQuery({
    queryKey: ["bill", groupId, viewingBillId],
    queryFn: () => apiClient.getBill(groupId!, viewingBillId!),
    enabled: Boolean(groupId && viewingBillId)
  });

  const settlementReceiptBillsQuery = useQuery({
    queryKey: getSettlementReceiptBillsQueryKey(groupId, settlementReceiptParticipantId, billsQuery.data ?? []),
    queryFn: async () => {
      const currentBills = billsQuery.data ?? [];
      return Promise.all(currentBills.map((bill) => apiClient.getBill(groupId!, bill.id)));
    },
    enabled: Boolean(groupId && settlementReceiptParticipantId && (billsQuery.data?.length ?? 0) > 0)
  });

  const group = groupQuery.data;
  const participants = participantsQuery.data ?? [];
  const bills = billsQuery.data ?? [];
  const settlement = settlementQuery.data;
  const transfers = settlement?.transfers ?? [];
  const netBalances = settlement?.netBalances ?? [];
  const isLocked = group ? isGroupLocked(group.status) : false;
  const canEditGroup = group?.canEdit ?? false;
  const isReadOnly = !canEditGroup || isLocked;
  const canCreateBills = !isReadOnly && participants.length > 0;
  const participantNameById = useMemo(
    () => Object.fromEntries(participants.map((participant) => [participant.id, participant.name])),
    [participants]
  );
  const effectivePayer = primaryPayerParticipantId || participants[0]?.id || "";
  const completeBillFees = useMemo(
    () => billFees.filter((fee) => getFeeRowState(fee) === "complete"),
    [billFees]
  );
  const previewSubtotal = useMemo(
    () => billItems.reduce((sum, item) => sum + (Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0), 0),
    [billItems]
  );
  const previewFees = useMemo(
    () => completeBillFees.reduce(
      (sum, fee) => sum + (fee.feeType === 1 ? (previewSubtotal * Number(fee.value)) / 100 : Number(fee.value)),
      0
    ),
    [completeBillFees, previewSubtotal]
  );
  const previewGrand = previewSubtotal + previewFees;
  const billEditorPreview = useMemo<BillPreviewData>(() => ({
    storeName: storeName.trim(),
    transactionDateUtc,
    primaryPayerName: participantNameById[effectivePayer] ?? "-",
    referenceImageDataUrl,
    items: billItems.map((item) => {
      const parsedAmount = Number(item.amount);
      const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
      return {
        id: item.id,
        description: item.description.trim() || "-",
        amount,
        responsibleParticipants: item.responsibleParticipantIds.map((participantId) => ({
          participantId,
          participantName: participantNameById[participantId] ?? participantId
        }))
      };
    }),
    fees: completeBillFees.map((fee) => {
      const parsedValue = Number(fee.value);
      const value = Number.isFinite(parsedValue) ? parsedValue : 0;
      const appliedAmount = fee.feeType === 1 ? (previewSubtotal * value) / 100 : value;
      return {
        id: fee.id,
        name: fee.name.trim(),
        feeType: fee.feeType,
        value,
        appliedAmount
      };
    }),
    subtotalAmount: previewSubtotal,
    totalFeeAmount: previewFees,
    grandTotalAmount: previewGrand
  }), [
    billItems,
    completeBillFees,
    effectivePayer,
    participantNameById,
    previewFees,
    previewGrand,
    previewSubtotal,
    referenceImageDataUrl,
    storeName,
    transactionDateUtc
  ]);
  const viewingBillPreview = useMemo<BillPreviewData | null>(() => {
    if (!viewingBillQuery.data) {
      return null;
    }

    return mapBillDetailToPreview(viewingBillQuery.data, participantNameById);
  }, [participantNameById, viewingBillQuery.data]);
  const settlementReceiptParticipant = participants.find((participant) => participant.id === settlementReceiptParticipantId) ?? null;
  const settlementReceiptData = useMemo(() => {
    if (!settlementReceiptParticipantId) {
      return buildSettlementReceiptData({ bills: [], participantId: "", perspective: "payable", t });
    }

    const participantBalance = netBalances.find((entry) => entry.participantId === settlementReceiptParticipantId)?.netAmount ?? 0;
    return buildSettlementReceiptData({
      bills: settlementReceiptBillsQuery.data ?? [],
      participantId: settlementReceiptParticipantId,
      perspective: participantBalance < 0 ? "payable" : "receivable",
      expectedTotalAmount: Math.abs(participantBalance),
      t
    });
  }, [netBalances, settlementReceiptBillsQuery.data, settlementReceiptParticipantId, t]);
  const billCompactControlBase = "input-base h-10 rounded-[12px] px-3 text-sm";
  const billCompactControlError = "border-danger focus:border-danger focus:ring-danger/10";
  const billCompactInputClass = (hasError?: boolean, extra?: string) =>
    [billCompactControlBase, hasError ? billCompactControlError : "", extra ?? ""].filter(Boolean).join(" ");

  const createParticipantMutation = useMutation({
    mutationFn: async (entries: Array<{ name: string; username?: string | null }>) => {
      if (!groupId) {
        throw new Error(t("participants.editMissing"));
      }

      await Promise.all(entries.map((entry) => apiClient.createParticipant(groupId, entry.name, entry.username ?? null)));
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["participants", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["bills", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["settlements", groupId] })
      ]);
      closeCreateDialog();
      showToast({ title: t("participants.addDialogTitle"), description: t("feedback.created"), tone: "success" });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setCreateError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  const updateParticipantMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!groupId || !editingParticipantId) {
        throw new Error(t("participants.editMissing"));
      }

      if (name.trim().startsWith("@")) {
        throw new Error(t("participants.editInviteBlocked"));
      }

      const duplicate = participants.some(
        (participant) =>
          participant.id !== editingParticipantId &&
          participant.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase()
      );

      if (duplicate) {
        throw new Error(t("participants.nameDuplicate"));
      }

      const currentParticipant = participants.find((participant) => participant.id === editingParticipantId);
      return apiClient.updateParticipant(groupId, editingParticipantId, { name, username: currentParticipant?.username ?? null });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["participants", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["bills", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["settlements", groupId] })
      ]);
      setEditError(null);
      setEditingParticipantId(null);
      showToast({ title: t("participants.editTitle"), description: t("feedback.saved"), tone: "success" });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setEditError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  const deleteParticipantMutation = useMutation({
    mutationFn: () => {
      if (!groupId || !deletingParticipantId) {
        throw new Error(t("participants.deleteMissing"));
      }

      return apiClient.deleteParticipant(groupId, deletingParticipantId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["participants", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["bills", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["settlements", groupId] })
      ]);
      setDeleteError(null);
      setDeletingParticipantId(null);
      showToast({ title: t("participants.deleteTitle"), description: t("feedback.deleted"), tone: "success" });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setDeleteError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  const createBillMutation = useMutation({
    mutationFn: () => {
      if (!groupId) {
        throw new Error(t("feedback.requestFailed"));
      }

      return apiClient.createBill(groupId, buildBillPayload());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bills", groupId] });
      void queryClient.invalidateQueries({ queryKey: ["settlements", groupId] });
      closeBillEditor(true);
      showToast({ title: t("bills.create"), description: t("feedback.saved"), tone: "success" });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setBillFormError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  const updateBillMutation = useMutation({
    mutationFn: () => {
      if (!groupId || !editingBillId) {
        throw new Error(t("bills.editMissing"));
      }

      return apiClient.updateBill(groupId, editingBillId, buildBillPayload());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bills", groupId] });
      void queryClient.invalidateQueries({ queryKey: ["settlements", groupId] });
      closeBillEditor(true);
      showToast({ title: t("bills.editTitle"), description: t("feedback.saved"), tone: "success" });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setBillFormError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  const isBillMutationPending = createBillMutation.isPending || updateBillMutation.isPending;

  const deleteBillMutation = useMutation({
    mutationFn: () => {
      if (!groupId || !deletingBillId) {
        throw new Error(t("bills.deleteMissing"));
      }

      return apiClient.deleteBill(groupId, deletingBillId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bills", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["settlements", groupId] })
      ]);
      setDeleteBillError(null);
      setDeletingBillId(null);
      if (viewingBillId === deletingBillId) {
        setViewingBillId(null);
      }
      showToast({ title: t("bills.deleteTitle"), description: t("feedback.deleted"), tone: "success" });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setDeleteBillError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: "settling" | "settled") => apiClient.updateGroupStatus(groupId!, { status }),
    onSuccess: async (nextGroup, nextStatus) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["group", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["groups"] }),
        queryClient.invalidateQueries({ queryKey: ["settlements", groupId] })
      ]);
      setStatusActionError(null);
      setIsStartSettlementOpen(false);
      setIsMarkSettledOpen(false);
      showToast({
        title: nextStatus === "settling" ? t("groups.startSettlementAction") : t("groups.markSettledAction"),
        description: t("feedback.saved"),
        tone: "success"
      });

      if (nextGroup.status === "settling" && !isGuest) {
        setIsShareDialogOpen(true);
      }
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setStatusActionError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  function clearCreateError() {
    if (createError) {
      setCreateError(null);
    }
  }

  function openCreateDialog() {
    if (isReadOnly) {
      return;
    }

    setDraftEntries([]);
    setInputValue("");
    setCreateError(null);
    setIsCreateDialogOpen(true);
  }

  function closeCreateDialog() {
    if (createParticipantMutation.isPending) {
      return;
    }

    setDraftEntries([]);
    setInputValue("");
    setCreateError(null);
    setIsCreateDialogOpen(false);
  }

  async function handleDownloadReceipt(participantId: string) {
    if (!groupId) {
      return;
    }

    setDownloadingReceiptIds((current) => new Set(current).add(participantId));

    try {
      const allBills = await queryClient.fetchQuery({
        queryKey: getSettlementReceiptBillsQueryKey(groupId, participantId, billsQuery.data ?? []),
        queryFn: async () => Promise.all((billsQuery.data ?? []).map((bill) => apiClient.getBill(groupId, bill.id)))
      });
      const participant = participants.find((entry) => entry.id === participantId);
      const participantBalance = netBalances.find((entry) => entry.participantId === participantId)?.netAmount ?? 0;
      const receipt = buildSettlementReceiptData({
        bills: allBills,
        participantId,
        perspective: participantBalance < 0 ? "payable" : "receivable",
        expectedTotalAmount: Math.abs(participantBalance),
        t
      });

      await downloadReceiptImage({
        fileName: createSummaryImageFileName(),
        participantId,
        participantName: participant?.name ?? participantId,
        receipt,
        balances: netBalances,
        transfers,
        receiverPaymentInfos: currentShareQuery.data?.receiverPaymentInfos ?? [],
        formatCurrency
      });
    }
    catch (error) {
      showToast({ title: t("feedback.requestFailed"), description: getErrorMessage(error), tone: "error" });
    }
    finally {
      setDownloadingReceiptIds((current) => {
        const next = new Set(current);
        next.delete(participantId);
        return next;
      });
    }
  }

  async function handleExportAllReceipts() {
    if (!groupId || !group || isExportingAllReceipts) {
      return;
    }

    setIsExportingAllReceipts(true);
    try {
      const allBills = await queryClient.fetchQuery({
        queryKey: getSettlementReceiptBillsQueryKey(groupId, null, billsQuery.data ?? []),
        queryFn: async () => Promise.all((billsQuery.data ?? []).map((bill) => apiClient.getBill(groupId, bill.id)))
      });

      await downloadAllReceiptsImage({
        fileName: createSummaryImageFileName(),
        groupName: group.name,
        participants: participants.map((participant) => {
          const participantBalance = netBalances.find((entry) => entry.participantId === participant.id)?.netAmount ?? 0;
          return {
            participantId: participant.id,
            participantName: participant.name,
            receipt: buildSettlementReceiptData({
              bills: allBills,
              participantId: participant.id,
              perspective: participantBalance < 0 ? "payable" : "receivable",
              expectedTotalAmount: Math.abs(participantBalance),
              t
            })
          };
        }),
        balances: netBalances,
        transfers,
        receiverPaymentInfos: currentShareQuery.data?.receiverPaymentInfos ?? [],
        formatCurrency
      });

      showToast({ title: t("settlement.exportAllReceipts"), description: t("feedback.saved"), tone: "success" });
    }
    catch (error) {
      showToast({ title: t("feedback.requestFailed"), description: getErrorMessage(error), tone: "error" });
    }
    finally {
      setIsExportingAllReceipts(false);
    }
  }

  function addEntryFromInput() {
    const raw = inputValue.trim();

    if (!raw) {
      return;
    }

    if (raw.startsWith("@")) {
      const matchedUser = searchedUserQuery.data;
      if (!matchedUser) {
        setCreateError(t("participants.userNotFound"));
        return;
      }

      setDraftEntries((current) => [
        ...current,
        {
          id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: matchedUser.name,
          username: matchedUser.username,
          isInvite: true
        }
      ]);
      setInputValue("");
      clearCreateError();
      return;
    }

    setDraftEntries((current) => [
      ...current,
      {
        id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: raw,
        username: null,
        isInvite: raw.startsWith("@")
      }
    ]);
    setInputValue("");
    clearCreateError();
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== "Tab") {
      return;
    }

    event.preventDefault();
    addEntryFromInput();
  }

  function removeEntry(id: string) {
    setDraftEntries((current) => current.filter((entry) => entry.id !== id));
    clearCreateError();
  }

  function handleCreateSave() {
    if (!groupId || createParticipantMutation.isPending || isReadOnly) {
      return;
    }

    if (draftEntries.length === 0) {
      setCreateError(t("participants.nameRequired"));
      return;
    }

    const entries = draftEntries.map((entry) => ({ name: entry.name.trim(), username: entry.username?.trim() || null }));
    const existingNames = new Set(participants.map((participant) => participant.name.trim().toLocaleLowerCase()));
    const existingUsernames = new Set(participants.map((participant) => participant.username?.trim().toLocaleLowerCase()).filter(Boolean));
    const seen = new Set<string>();
    const seenUsernames = new Set<string>();

    for (const entry of entries) {
      const name = entry.name;
      if (!name) {
        setCreateError(t("participants.nameRequired"));
        return;
      }

      const key = name.toLocaleLowerCase();
      if (existingNames.has(key) || seen.has(key)) {
        setCreateError(t("participants.nameDuplicate"));
        return;
      }

      seen.add(key);

      const usernameKey = entry.username?.toLocaleLowerCase();
      if (usernameKey) {
        if (existingUsernames.has(usernameKey) || seenUsernames.has(usernameKey)) {
          setCreateError(t("participants.nameDuplicate"));
          return;
        }

        seenUsernames.add(usernameKey);
      }
    }

    setCreateError(null);
    createParticipantMutation.mutate(entries);
  }

  function clearBillFormError() {
    if (billFormError) {
      setBillFormError(null);
    }
  }

  function clearBillFieldError(field: keyof BillFieldErrors) {
    setBillFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
    clearBillFormError();
  }

  function clearBillItemError(itemId: string, field: keyof DraftItemErrors[string]) {
    setBillItemErrors((current) => {
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
    clearBillFieldError("items");
  }

  function clearBillFeeError(feeId: string, field: keyof DraftFeeErrors[string]) {
    setBillFeeErrors((current) => {
      if (!current[feeId]?.[field]) {
        return current;
      }

      const next = { ...current };
      const nextFee = { ...next[feeId] };
      delete nextFee[field];
      if (Object.keys(nextFee).length === 0) {
        delete next[feeId];
      }
      else {
        next[feeId] = nextFee;
      }
      return next;
    });
    clearBillFieldError("fees");
  }

  function resetBillEditor() {
    setBillModalMode("create");
    setEditingBillId(null);
    setStoreName("");
    setReferenceImageDataUrl("");
    setTransactionDateUtc("");
    setSplitMode(1);
    setPrimaryPayerParticipantId(participants[0]?.id ?? "");
    setBillItems([createItem()]);
    setBillFees([]);
    setWeights({});
    setBillFieldErrors({});
    setBillItemErrors({});
    setBillFeeErrors({});
    setBillFormError(null);
  }

  function openBillEditor() {
    if (!canCreateBills) {
      return;
    }

    resetBillEditor();
    setBillModalMode("create");
    setIsBillEditorOpen(true);
  }

  function closeBillEditor(force = false) {
    if (!force && (createBillMutation.isPending || updateBillMutation.isPending)) {
      return;
    }

    resetBillEditor();
    setIsBillEditorOpen(false);
  }

  async function openBillEditorForEdit(billId: string) {
    if (!groupId || isReadOnly) {
      return;
    }

    const detail = await apiClient.getBill(groupId, billId);
    resetBillEditor();
    setBillModalMode("edit");
    setEditingBillId(detail.id);
    setStoreName(detail.storeName);
    setReferenceImageDataUrl(detail.referenceImageDataUrl ?? "");
    setTransactionDateUtc(new Date(detail.transactionDateUtc).toISOString().slice(0, 10));
    setSplitMode(detail.splitMode);
    setPrimaryPayerParticipantId(detail.primaryPayerParticipantId);
    setBillItems(detail.items.map((item) => ({
      id: item.id,
      description: item.description,
      amount: String(item.amount),
      responsibleParticipantIds: item.responsibleParticipants.map((participant) => participant.participantId)
    })));
    setBillFees(detail.fees.map((fee) => ({
      id: fee.id,
      name: fee.name,
      feeType: fee.feeType,
      value: String(fee.value)
    })));
    setWeights(Object.fromEntries(detail.shares.map((share) => [share.participantId, String(share.weight)])));
    setIsBillEditorOpen(true);
  }

  function addBillItem() {
    setBillItems((current) => [...current, createItem()]);
    clearBillFieldError("items");
  }

  function removeBillItem(itemId: string) {
    setBillItems((current) => current.length === 1 ? current : current.filter((item) => item.id !== itemId));
    setBillItemErrors((current) => {
      if (!current[itemId]) {
        return current;
      }

      const next = { ...current };
      delete next[itemId];
      return next;
    });
    clearBillFieldError("items");
  }

  function updateBillItem(itemId: string, field: "description" | "amount", value: string) {
    setBillItems((current) => current.map((item) => item.id === itemId ? { ...item, [field]: value } : item));
    clearBillItemError(itemId, field);
  }

  function addBillFee() {
    setBillFees((current) => [...current, createFee()]);
    clearBillFieldError("fees");
  }

  function removeBillFee(feeId: string) {
    setBillFees((current) => current.filter((fee) => fee.id !== feeId));
    setBillFeeErrors((current) => {
      if (!current[feeId]) {
        return current;
      }

      const next = { ...current };
      delete next[feeId];
      return next;
    });
    clearBillFieldError("fees");
  }

  function updateBillFee(feeId: string, field: "name" | "value", value: string) {
    setBillFees((current) => current.map((fee) => fee.id === feeId ? { ...fee, [field]: value } : fee));
    clearBillFeeError(feeId, field);
  }

  function updateBillFeeType(feeId: string, value: FeeType) {
    setBillFees((current) => current.map((fee) => fee.id === feeId ? { ...fee, feeType: value } : fee));
    clearBillFieldError("fees");
  }

  function buildBillPayload(): CreateBillRequest {
    const items: BillItemInput[] = billItems.map((item) => ({
      description: item.description.trim(),
      amount: Number(item.amount),
      responsibleParticipantIds: item.responsibleParticipantIds
    }));
    const activeParticipantIds = new Set<string>([effectivePayer]);
    for (const item of items) {
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
    const fees: BillFeeInput[] = completeBillFees.map((fee) => ({
      name: fee.name.trim(),
      feeType: fee.feeType,
      value: Number(fee.value)
    }));

    return {
      storeName: storeName.trim(),
      referenceImageDataUrl: referenceImageDataUrl.trim() || null,
      transactionDateUtc: new Date(transactionDateUtc).toISOString(),
      splitMode,
      primaryPayerParticipantId: effectivePayer,
      items,
      fees,
      participants: billParticipants,
      extraContributions: []
    };
  }

  function validateBillEditor(step: 1 | 2 | 3) {
    if (!groupId || createBillMutation.isPending || isReadOnly) {
      return false;
    }

    if (participants.length === 0) {
      const message = t("bills.noParticipantsBody");
      setBillFormError(message);
      showToast({ title: t("feedback.validationFailed"), description: message, tone: "error" });
      return false;
    }

    const nextFieldErrors: BillFieldErrors = {};
    const nextItemErrors: DraftItemErrors = {};
    const nextFeeErrors: DraftFeeErrors = {};
    let firstMessage: string | null = null;

    const setFieldError = (field: keyof BillFieldErrors, message: string) => {
      if (!nextFieldErrors[field]) {
        nextFieldErrors[field] = message;
      }
      if (!firstMessage) {
        firstMessage = message;
      }
    };

    const setItemError = (itemId: string, field: keyof DraftItemErrors[string], message: string) => {
      nextItemErrors[itemId] = { ...nextItemErrors[itemId], [field]: message };
      if (!nextFieldErrors.items) {
        nextFieldErrors.items = message;
      }
      if (!firstMessage) {
        firstMessage = message;
      }
    };

    const setFeeError = (feeId: string, field: keyof DraftFeeErrors[string], message: string) => {
      nextFeeErrors[feeId] = { ...nextFeeErrors[feeId], [field]: message };
      if (!nextFieldErrors.fees) {
        nextFieldErrors.fees = message;
      }
      if (!firstMessage) {
        firstMessage = message;
      }
    };

    if (!storeName.trim()) {
      setFieldError("storeName", t("bills.storeRequired"));
    }

    if (!transactionDateUtc || Number.isNaN(new Date(transactionDateUtc).getTime())) {
      setFieldError("transactionDateUtc", t("bills.dateRequired"));
    }

    if (!effectivePayer) {
      setFieldError("primaryPayer", t("bills.payerRequired"));
    }

    if (splitMode === 2) {
      for (const participant of participants) {
        const weightValue = Number(weights[participant.id] ?? "1");
        if (!Number.isFinite(weightValue) || weightValue <= 0) {
          setFieldError("weights", t("bills.weightInvalid"));
          break;
        }
      }
    }

    if (step >= 2) {
      if (billItems.length === 0) {
        setFieldError("items", t("bills.itemsRequired"));
      }

      for (const item of billItems) {
        if (!item.description.trim()) {
          setItemError(item.id, "description", t("bills.itemRequired"));
        }

        const amount = Number(item.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          setItemError(item.id, "amount", t("bills.amountInvalid"));
        }

        if (item.responsibleParticipantIds.length === 0) {
          setItemError(item.id, "responsible", t("bills.responsibleRequired"));
        }
      }
    }

    if (step >= 3) {
      for (const fee of billFees) {
        if (getFeeRowState(fee) !== "partial") {
          continue;
        }

        const hasName = fee.name.trim() !== "";
        const parsedValue = fee.value.trim() === "" ? null : Number(fee.value);
        if (!hasName) {
          setFeeError(fee.id, "name", t("bills.feeNameRequired"));
        }
        if (!Number.isFinite(parsedValue) || parsedValue === null || parsedValue <= 0) {
          setFeeError(fee.id, "value", t("bills.feeValueRequired"));
        }
      }
    }

    if (firstMessage) {
      setBillFieldErrors(nextFieldErrors);
      setBillItemErrors(nextItemErrors);
      setBillFeeErrors(nextFeeErrors);
      setBillFormError(firstMessage);
      showToast({ title: t("feedback.validationFailed"), description: firstMessage, tone: "error" });
      return false;
    }

    setBillFieldErrors({});
    setBillItemErrors({});
    setBillFeeErrors({});
    setBillFormError(null);
    return true;
  }

  function handleBillSave() {
    if (!validateBillEditor(3)) {
      return;
    }

    if (billModalMode === "edit" && editingBillId) {
      updateBillMutation.mutate();
      return;
    }

    createBillMutation.mutate();
  }

  async function handleReferenceFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const dataUrl = await prepareSettlementProofImageDataUrl(file);
      setReferenceImageDataUrl(dataUrl);
      clearBillFormError();
    }
    catch (error) {
      const message = error instanceof Error ? t("bills.referenceInvalid") : t("bills.referenceInvalid");
      setBillFormError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
    finally {
      event.target.value = "";
    }
  }

  function handleRetry() {
    void groupQuery.refetch();
    void participantsQuery.refetch();
    void billsQuery.refetch();
    void settlementQuery.refetch();
  }

  if (groupQuery.isPending || participantsQuery.isPending || billsQuery.isPending || settlementQuery.isPending) {
    return <LoadingState lines={4} />;
  }

  if (groupQuery.isError || participantsQuery.isError || billsQuery.isError || settlementQuery.isError) {
    const error = groupQuery.error ?? participantsQuery.error ?? billsQuery.error ?? settlementQuery.error;

    return (
      <InlineMessage
        tone="error"
        title={t("feedback.loadFailed")}
        action={(
          <button className="button-secondary" onClick={handleRetry} type="button">
            {t("common.retry")}
          </button>
        )}
      >
        {getErrorMessage(error)}
      </InlineMessage>
    );
  }

  if (!group) {
    return (
      <EmptyState
        icon={<UsersIcon className="h-6 w-6" />}
        title={t("feedback.loadFailed")}
        description={t("groups.overviewMissing")}
      />
    );
  }

  return (
    <div className="group-detail-page space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <Link className="inline-flex items-center gap-2 font-medium text-ink" to="/groups">
          <ChevronLeftIcon className="h-4 w-4" />
          {t("groups.detailBreadcrumb")}
        </Link>
        <span aria-hidden="true">→</span>
        <span className="font-semibold text-ink">{group.name}</span>
      </div>

      <SectionCard className="p-4 md:p-6">
        <div className="group-detail-kicker text-[10px] font-semibold uppercase tracking-[0.18em]">
          {t("groups.overviewSectionTitle")}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatTile label={t("groups.participantCount")} value={String(participants.length)} icon={<UsersIcon className="h-5 w-5" />} />
          <StatTile label={t("groups.billCount")} value={String(bills.length)} icon={<ReceiptIcon className="h-5 w-5" />} />
          <StatTile label={t("groups.createdOnLabel")} value={formatGroupCreatedAt(group.createdAtUtc, language)} icon={<CalendarIcon className="h-5 w-5" />} />
          <div className="stat-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-muted">{t("groups.columnStatus")}</div>
                <div className="mt-3">
                  <GroupStatusBadge status={group.status} t={t} />
                </div>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white text-brand">
                <CheckIcon className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">{t("groups.participantsSectionTitle")}</h2>
          </div>
          <IconActionButton
            disabled={isReadOnly}
            icon={<PlusIcon className="h-5 w-5" />}
            label={t("participants.addAction")}
            onClick={openCreateDialog}
          />
        </div>

        {isReadOnly ? (
          <div className="mt-4">
            <InlineMessage tone="info">{canEditGroup ? t("groups.readOnlyHint") : t("groups.readOnlyMemberHint")}</InlineMessage>
          </div>
        ) : null}

        <div className="mt-6">
          {participants.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="h-6 w-6" />}
              title={t("participants.emptyTitle")}
              description={t("participants.emptyBody")}
              action={!isReadOnly ? (
                <button className="button-secondary" onClick={openCreateDialog} type="button">
                  {t("participants.addAction")}
                </button>
              ) : undefined}
            />
          ) : (
            <div className="max-h-[340px] overflow-y-auto pr-1">
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {participants.map((participant) => (
                  <li key={participant.id}>
                    <article className=" flex min-h-[58px] items-center gap-3 rounded-[20px] border border-slate-200 bg-white/82 px-4 py-3 shadow-sm">
                      <div className="min-w-0 flex flex-1 flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
                        <span className="truncate font-semibold text-ink">{participant.name}</span>
                        <span className="hidden shrink-0 text-muted sm:inline">-</span>
                        <span className="truncate text-muted">{getParticipantHandle(participant.name, participant.username)}</span>
                        <span className={["tag shrink-0", getParticipantInvitationMeta(participant.invitationStatus).className].join(" ")}>
                          {t(getParticipantInvitationMeta(participant.invitationStatus).labelKey as any)}
                        </span>
                      </div>
                      {!isReadOnly ? (
                        <div className="flex shrink-0 items-center gap-2 text-xs font-semibold">
                          <IconActionButton
                            icon={<PencilIcon className="h-4 w-4 text-brand" />}
                            label={t("participants.editAction")}
                            onClick={() => {
                              setEditError(null);
                              setEditingParticipantId(participant.id);
                            }}
                            size="sm"
                          />
                          <IconActionButton
                            icon={<TrashIcon className="h-4 w-4 text-danger" />}
                            label={t("common.delete")}
                            onClick={() => {
                              setDeleteError(null);
                              setDeletingParticipantId(participant.id);
                            }}
                            size="sm"
                          />
                        </div>
                      ) : null}
                    </article>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard className="p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">{t("groups.billsSectionTitle")}</h2>
          </div>
          <IconActionButton
            disabled={!canCreateBills}
            icon={<PlusIcon className="h-5 w-5" />}
            label={t("sidebar.createBill")}
            onClick={openBillEditor}
          />
        </div>

        {!canCreateBills && !isReadOnly ? (
          <div className="mt-4">
            <InlineMessage tone="info">{t("bills.noParticipantsBody")}</InlineMessage>
          </div>
        ) : null}

        <div className="mt-6">
          {bills.length === 0 ? (
            <EmptyState
              icon={<ReceiptIcon className="h-6 w-6" />}
              title={t("bills.empty")}
              description={t("bills.emptyBody")}
              action={canCreateBills ? (
                <button className="button-secondary" onClick={openBillEditor} type="button">
                  {t("bills.create")}
                </button>
              ) : undefined}
            />
          ) : (
            <div className="space-y-3">
              <div className="space-y-3 xl:hidden">
                {bills.map((bill) => (
                  <article key={bill.id} className="list-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">{bill.storeName}</div>
                        <div className="mt-2 text-xs text-muted">{formatDate(bill.transactionDateUtc, language)}</div>
                      </div>
                      <span className="tag bg-slate-100 text-muted">{bill.splitMode === 2 ? t("bills.weighted") : t("bills.equal")}</span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-[14px] border border-slate-200/80 bg-slate-50/80 px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t("bills.primaryPayer")}</div>
                        <div className="mt-1 truncate text-sm font-semibold text-ink">{participantNameById[bill.primaryPayerParticipantId] ?? "-"}</div>
                      </div>
                      <div className="rounded-[14px] border border-slate-200/80 bg-slate-50/80 px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t("bills.total")}</div>
                        <div className="mt-1 text-sm font-semibold text-ink">{formatCurrency(bill.grandTotalAmount)}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <IconActionButton
                        icon={<EyeIcon className="h-4 w-4" />}
                        label={t("common.view")}
                        onClick={() => setViewingBillId(bill.id)}
                        size="sm"
                      />
                      <IconActionButton
                        disabled={isReadOnly}
                        icon={<PencilIcon className="h-4 w-4 text-brand" />}
                        label={t("bills.editAction")}
                        onClick={() => void openBillEditorForEdit(bill.id)}
                        size="sm"
                      />
                      <IconActionButton
                        disabled={isReadOnly}
                        icon={<TrashIcon className="h-4 w-4 text-danger" />}
                        label={t("common.delete")}
                        onClick={() => {
                          setDeleteBillError(null);
                          setDeletingBillId(bill.id);
                        }}
                        size="sm"
                      />
                    </div>
                  </article>
                ))}
              </div>

              <div className="dashboard-activity-table hidden overflow-x-auto xl:block">
                <div className="dashboard-activity-table-header group-bills-table-header min-w-[980px]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t("bills.date")}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t("bills.store")}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t("bills.splitMode")}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t("bills.primaryPayer")}</div>
                  <div className="text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t("bills.subtotal")}</div>
                  <div className="text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t("bills.fees")}</div>
                  <div className="text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t("bills.total")}</div>
                  <div className="text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t("groups.columnActions")}</div>
                </div>
                <ul className="min-w-[980px]">
                  {bills.map((bill) => (
                    <li key={bill.id}>
                      <div className="dashboard-activity-table-row group-bills-table-row">
                        <div className="text-sm text-muted">{formatDate(bill.transactionDateUtc, language)}</div>
                        <div className="truncate text-sm font-semibold text-ink">{bill.storeName}</div>
                        <div className="text-sm text-muted">{bill.splitMode === 2 ? t("bills.weighted") : t("bills.equal")}</div>
                        <div className="truncate text-sm text-ink">{participantNameById[bill.primaryPayerParticipantId] ?? "-"}</div>
                        <div className="text-right text-sm text-ink">{formatCurrency(bill.subtotalAmount)}</div>
                        <div className="text-right text-sm text-ink">{formatCurrency(bill.totalFeeAmount)}</div>
                        <div className="text-right text-sm font-semibold text-ink">{formatCurrency(bill.grandTotalAmount)}</div>
                        <div className="flex justify-end gap-2 text-xs font-semibold">
                          <IconActionButton
                            icon={<EyeIcon className="h-4 w-4" />}
                            label={t("common.view")}
                            onClick={() => setViewingBillId(bill.id)}
                            size="sm"
                          />
                          <IconActionButton
                            disabled={isReadOnly}
                            icon={<PencilIcon className="h-4 w-4 text-brand" />}
                            label={t("bills.editAction")}
                            onClick={() => void openBillEditorForEdit(bill.id)}
                            size="sm"
                          />
                          <IconActionButton
                            disabled={isReadOnly}
                            icon={<TrashIcon className="h-4 w-4 text-danger" />}
                            label={t("common.delete")}
                            onClick={() => {
                              setDeleteBillError(null);
                              setDeletingBillId(bill.id);
                            }}
                            size="sm"
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard className="p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="section-title">{t("groups.settlementSectionTitle")}</h2>
            {transfers.length > 0 ? (
              <span className="group-detail-badge tag border border-brand/10 bg-brand/5 text-brand">{transfers.length} {t("settlement.transferCount")}</span>
            ) : null}
            <p className="mt-2 section-copy">{t("settlement.subtitle")}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {group?.status === "unresolved" ? (
              <button
                className="button-primary"
                disabled={updateStatusMutation.isPending || bills.length === 0 || isReadOnly}
                onClick={() => {
                  setStatusActionError(null);
                  setIsStartSettlementOpen(true);
                }}
                type="button"
              >
                {updateStatusMutation.isPending ? <LoadingSpinner /> : null}
                {t("groups.startSettlementAction")}
              </button>
            ) : null}
            {!isGuest && transfers.length > 0 ? (
              <IconActionButton
                disabled={isExportingAllReceipts}
                icon={<ExportIcon className="h-5 w-5" />}
                label={t("settlement.exportAllReceipts")}
                onClick={() => void handleExportAllReceipts()}
              />
            ) : null}
            {group?.status === "settling" && !isGuest && canEditGroup ? (
              <>
                <button
                  className="button-primary"
                  disabled={updateStatusMutation.isPending}
                  onClick={() => {
                    setStatusActionError(null);
                    setIsMarkSettledOpen(true);
                  }}
                  type="button"
                >
                  {updateStatusMutation.isPending ? <LoadingSpinner /> : null}
                  {t("groups.markSettledAction")}
                </button>
                <IconActionButton
                  icon={<LinkIcon className="h-5 w-5" />}
                  label={t("groups.shareLinkAction")}
                  onClick={() => setIsShareDialogOpen(true)}
                />
              </>
            ) : null}
          </div>
        </div>

        {group?.status === "unresolved" && bills.length === 0 ? (
          <div className="group-detail-note mt-4 rounded-[20px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-muted">
            {t("groups.startSettlementHintDisabled")}
          </div>
        ) : null}
        {isReadOnly && !canEditGroup ? (
          <div className="mt-4">
            <InlineMessage tone="info">{t("groups.readOnlyMemberHint")}</InlineMessage>
          </div>
        ) : null}

        <div className="mt-6">
          {transfers.length === 0 ? (
            <EmptyState
              icon={<ReceiptIcon className="h-6 w-6" />}
              title={t("groups.settlementEmptyTitle")}
              description={t("groups.settlementEmptyBody")}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {participants.map((participant) => {
                const outgoingTransfers = transfers.filter((transfer) => transfer.fromParticipantId === participant.id);
                const incomingTransfers = transfers.filter((transfer) => transfer.toParticipantId === participant.id);
                const totalIncoming = incomingTransfers.reduce((sum, transfer) => sum + transfer.amount, 0);
                const participantPaymentStatus = getParticipantPaymentStatus(outgoingTransfers, incomingTransfers);

                if (outgoingTransfers.length === 0 && totalIncoming === 0) {
                  return null;
                }

                return (
                  <article key={participant.id} className="group-detail-settlement-card rounded-[24px] border border-slate-200 bg-white/82 p-4 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold tracking-tight text-ink">{participant.name}</div>
                        {participant.username ? (
                          <div className="mt-1 text-xs text-muted">{getParticipantHandle(participant.name, participant.username)}</div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`tag ${paymentStatusTone(participantPaymentStatus)}`}>
                          {paymentStatusLabel(participantPaymentStatus, t)}
                        </span>
                        <IconActionButton
                          icon={<EyeIcon className="h-4 w-4" />}
                          label={t("common.view")}
                          onClick={() => setSettlementReceiptParticipantId(participant.id)}
                          size="sm"
                        />
                        <IconActionButton
                          disabled={downloadingReceiptIds.has(participant.id)}
                          icon={<DownloadIcon className="h-4 w-4" />}
                          label={t("common.download")}
                          onClick={() => void handleDownloadReceipt(participant.id)}
                          size="sm"
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      {outgoingTransfers.map((transfer) => (
                        <div
                          key={transfer.transferKey}
                          className="group-detail-chip rounded-[16px] border border-slate-200 bg-slate-50/80 px-3 py-2 text-ink"
                        >
                          {t("settlement.pays")}{" "}
                          {participantNameById[transfer.toParticipantId] ?? transfer.toParticipantId.slice(0, 8)}{" "}
                          <span className="font-semibold text-red-600">
                            {formatCurrency(transfer.amount)}
                          </span>
                        </div>
                      ))}

                      {totalIncoming > 0 ? (
                        <div className="group-detail-chip rounded-[16px] border border-brand/10 bg-brand/5 px-3 py-2 text-ink">
                          {t("groups.balanceReceives")}{" "}
                          <span className="font-semibold text-cyan-700">
                            {formatCurrency(totalIncoming)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              }).filter(Boolean)}
            </div>
          )}
        </div>
      </SectionCard>

      <ModalDialog
        open={isCreateDialogOpen}
        title={t("participants.addDialogTitle")}
        description={t("participants.addDialogBody")}
        onClose={closeCreateDialog}
        className="sm:max-w-4xl"
        actions={(
          <>
            <button className="button-secondary w-full sm:w-auto" disabled={createParticipantMutation.isPending} onClick={closeCreateDialog} type="button">
              {t("common.cancel")}
            </button>
            <button
              className="button-primary w-full sm:w-auto"
              disabled={createParticipantMutation.isPending || draftEntries.length === 0}
              onClick={handleCreateSave}
              type="button"
            >
              {createParticipantMutation.isPending ? <LoadingSpinner /> : null}
              {t("participants.addSubmit")} ({draftEntries.length})
            </button>
          </>
        )}
      >
        <div className="space-y-6">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("participants.previewPanelTitle")}</div>
            <div className="min-h-[160px] rounded-[20px] border border-dashed border-slate-200 bg-slate-50/70 p-3">
              {draftEntries.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-muted">
                  {t("participants.previewEmpty")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {draftEntries.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-2 rounded-full border border-slate-100 bg-white px-3 py-2 shadow-sm">
                      <span className="truncate text-sm font-semibold text-ink">{entry.name}</span>
                      {entry.username ? <span className="truncate text-xs text-muted">{getParticipantHandle(entry.name, entry.username)}</span> : null}
                      {entry.isInvite ? (
                        <span className="group-detail-badge tag shrink-0 border border-brand/10 bg-brand/5 text-brand">{t("participants.statusInvited")}</span>
                      ) : (
                        <span className="tag shrink-0 bg-slate-100 text-muted">{t("participants.statusManual")}</span>
                      )}
                      <div className="ml-auto shrink-0">
                        <IconActionButton
                          icon={<TrashIcon className="h-4 w-4" />}
                          label={t("participants.removeRow")}
                          onClick={() => removeEntry(entry.id)}
                          size="sm"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("participants.inputPanelTitle")}</div>
            <div className="flex gap-2">
              <input
                className="input-base flex-1"
                placeholder={t("participants.searchPlaceholder")}
                value={inputValue}
                onChange={(event) => {
                  setInputValue(event.target.value);
                  clearCreateError();
                }}
                onKeyDown={handleInputKeyDown}
              />
              <button className="button-secondary shrink-0" type="button" onClick={addEntryFromInput}>
                {t("participants.addEntryAction")}
              </button>
            </div>
            {inputValue.trim().startsWith("@") ? (
              <div className="group-detail-note mt-3 rounded-[18px] border border-slate-200 bg-slate-50/80 p-3">
                {searchedUsername.length < 3 ? (
                  <div className="text-sm text-muted">{t("participants.userSearchHint")}</div>
                ) : searchedUserQuery.isPending ? (
                  <div className="text-sm text-muted">{t("participants.userSearching")}</div>
                ) : searchedUserQuery.data ? (
                  <button
                    className="flex w-full items-center justify-between gap-3 rounded-[14px] border border-brand/10 bg-white px-3 py-3 text-left"
                    onClick={addEntryFromInput}
                    type="button"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{searchedUserQuery.data.name}</div>
                      <div className="mt-1 text-xs text-muted">{getParticipantHandle(searchedUserQuery.data.name, searchedUserQuery.data.username)}</div>
                    </div>
                    <span className="group-detail-badge tag border border-brand/10 bg-brand/5 text-brand">{t("participants.statusInvited")}</span>
                  </button>
                ) : (
                  <div className="text-sm text-muted">{t("participants.userNotFound")}</div>
                )}
              </div>
            ) : null}
            <p className="mt-2 text-xs text-muted">{t("participants.inputHint")}</p>
            {createError ? <div className="mt-3"><InlineMessage tone="error">{createError}</InlineMessage></div> : null}
          </div>
        </div>
      </ModalDialog>

      <ModalDialog
        open={isBillEditorOpen}
        title={billModalMode === "edit" ? t("bills.editTitle") : t("bills.create")}
        description={''}
        onClose={() => closeBillEditor()}
        className="sm:max-w-7xl"
        actions={(
          <>
            <button className="button-secondary w-full sm:w-auto" disabled={isBillMutationPending} onClick={() => closeBillEditor()} type="button">
              {t("common.cancel")}
            </button>
            <button className="button-primary w-full sm:w-auto" disabled={isBillMutationPending} onClick={handleBillSave} type="button">
              {isBillMutationPending ? <LoadingSpinner /> : null}
              {billModalMode === "edit" ? t("common.saveChanges") : t("bills.create")}
            </button>
          </>
        )}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="space-y-4">
            <section className="space-y-4 rounded-[16px] border border-slate-200/80 bg-white p-3.5 sm:p-4">
              {/* <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("bills.gdStep1")}</div> */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted" htmlFor="group-detail-store-name">{t("bills.store")}</label>
                  <input
                    id="group-detail-store-name"
                    className={billCompactInputClass(Boolean(billFieldErrors.storeName), "w-full")}
                    value={storeName}
                    onChange={(event) => {
                      setStoreName(event.target.value);
                      clearBillFieldError("storeName");
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted" htmlFor="group-detail-transaction-date">{t("bills.date")}</label>
                  <input
                    id="group-detail-transaction-date"
                    type="date"
                    className={billCompactInputClass(Boolean(billFieldErrors.transactionDateUtc), "w-full")}
                    value={transactionDateUtc}
                    onChange={(event) => {
                      setTransactionDateUtc(event.target.value);
                      clearBillFieldError("transactionDateUtc");
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("bills.splitMode")}</label>
                  <CustomSelect
                    ariaLabel={t("bills.splitMode")}
                    compact
                    value={String(splitMode)}
                    options={[
                      { value: "1", label: t("bills.equal") },
                      { value: "2", label: t("bills.weighted") }
                    ]}
                    onChange={(value) => {
                      setSplitMode(Number(value) as SplitMode);
                      clearBillFieldError("weights");
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("bills.primaryPayer")}</label>
                  <CustomSelect
                    ariaLabel={t("bills.primaryPayer")}
                    compact
                    invalid={Boolean(billFieldErrors.primaryPayer)}
                    value={effectivePayer}
                    options={participants.map((participant) => ({
                      value: participant.id,
                      label: participant.name
                    }))}
                    onChange={(value) => {
                      setPrimaryPayerParticipantId(value);
                      clearBillFieldError("primaryPayer");
                    }}
                  />
                </div>
              </div>

              <div className="rounded-[14px] border border-slate-200/80 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-2.5">
                  <div>
                    <div className="text-sm font-semibold text-ink">{t("bills.reference")}</div>
                  </div>
                  <input
                    ref={referenceInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleReferenceFileSelected}
                    type="file"
                  />
                  <button
                    className="inline-flex h-9 shrink-0 items-center rounded-[11px] border border-slate-200 bg-white px-3 text-xs font-semibold text-ink transition hover:bg-slate-50"
                    onClick={() => referenceInputRef.current?.click()}
                    type="button"
                  >
                    {referenceImageDataUrl ? t("bills.referenceReplace") : t("bills.referenceUpload")}
                  </button>
                </div>
                {referenceImageDataUrl ? (
                  <div className="mt-3 rounded-[12px] border border-slate-200 bg-white p-2.5">
                    <img alt={t("bills.reference")} className="max-h-56 w-full rounded-[10px] object-contain" src={referenceImageDataUrl} />
                    <div className="mt-2.5 flex justify-end">
                      <button className="button-pill px-3 py-1 text-xs" onClick={() => setReferenceImageDataUrl("")} type="button">
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {splitMode === 2 ? (
                <div className="rounded-[14px] border border-slate-200/80 bg-slate-50/70 p-3">
                  <div className="text-sm font-semibold text-ink">{t("bills.weighted")}</div>
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {participants.map((participant) => (
                      <label key={participant.id} className="block">
                        <span className="mb-1.5 block text-sm font-medium text-ink">{participant.name}</span>
                        <input
                          min="1"
                          type="number"
                          className={billCompactInputClass(Boolean(billFieldErrors.weights), "w-full")}
                          value={weights[participant.id] ?? "1"}
                          onChange={(event) => {
                            setWeights((current) => ({ ...current, [participant.id]: event.target.value }));
                            clearBillFieldError("weights");
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="space-y-4 rounded-[16px] border border-slate-200/80 bg-white p-3.5 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("bills.gdStep2")}</div>
                </div>
                <IconActionButton
                  icon={<PlusIcon className="h-4 w-4" />}
                  label={t("bills.addItem")}
                  onClick={addBillItem}
                  size="sm"
                />
              </div>

<div className="space-y-2.5">
  {billItems.map((item, index) => (
    <div
      key={item.id}
      className="rounded-[14px] border border-slate-200/80 bg-slate-50/75 p-2.5"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {t("bills.item")} {String(index + 1).padStart(2, "0")}
        </div>

        <IconActionButton
          disabled={billItems.length === 1}
          icon={<TrashIcon className="h-4 w-4" />}
          label={t("common.delete")}
          onClick={() => removeBillItem(item.id)}
          size="sm"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_84px]">
        <input
          className={billCompactInputClass(
            Boolean(billItemErrors[item.id]?.description),
            "w-full"
          )}
          placeholder={t("bills.itemDescription")}
          value={item.description}
          onChange={(event) =>
            updateBillItem(item.id, "description", event.target.value)
          }
        />

        <input
          className={billCompactInputClass(
            Boolean(billItemErrors[item.id]?.amount),
            "w-full text-right"
          )}
          type="number"
          placeholder="0.00"
          value={item.amount}
          onChange={(event) =>
            updateBillItem(item.id, "amount", event.target.value)
          }
        />
      </div>

      <div className="mt-2 min-w-0">
        <CustomMultiSelect
          ariaLabel={t("bills.responsible")}
          compact
          invalid={Boolean(billItemErrors[item.id]?.responsible)}
          options={participants.map((participant) => ({
            value: participant.id,
            label: participant.name,
          }))}
          value={item.responsibleParticipantIds}
          onChange={(nextIds) => {
            setBillItems((current) =>
              current.map((entry) =>
                entry.id === item.id
                  ? { ...entry, responsibleParticipantIds: nextIds }
                  : entry
              )
            );
            clearBillItemError(item.id, "responsible");
          }}
          placeholder={t("bills.responsiblePlaceholder")}
        />
      </div>
    </div>
  ))}
</div>
              <div className="rounded-[12px] border border-slate-200 bg-white px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted">{t("bills.subtotal")}</span>
                  <span className="text-sm font-semibold text-ink">{formatCurrency(previewSubtotal)}</span>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-[16px] border border-slate-200/80 bg-white p-3.5 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("bills.feesOptional")}</div>
                </div>
                <IconActionButton
                  icon={<PlusIcon className="h-4 w-4" />}
                  label={t("bills.addCharge")}
                  onClick={addBillFee}
                  size="sm"
                />
              </div>

              {billFees.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-slate-200 bg-slate-50/75 px-3 py-3 text-sm text-muted">
                  {t("bills.noFeesYet")}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {billFees.map((fee) => (
                    <div key={fee.id} className="rounded-[14px] border border-slate-200/80 bg-slate-50/75 p-2.5">
                      <div className="grid gap-2 sm:gap-2.5 sm:grid-cols-[minmax(0,1fr)_142px_112px_34px]">
                        <input
                          className={billCompactInputClass(Boolean(billFeeErrors[fee.id]?.name), "w-full")}
                          placeholder={t("bills.fees")}
                          value={fee.name}
                          onChange={(event) => updateBillFee(fee.id, "name", event.target.value)}
                        />
                        <CustomSelect
                          ariaLabel={t("bills.fees")}
                          className="w-full"
                          compact
                          options={[
                            { value: "1", label: t("bills.percentage") },
                            { value: "2", label: t("bills.fixed") }
                          ]}
                          value={String(fee.feeType)}
                          onChange={(value) => updateBillFeeType(fee.id, Number(value) as FeeType)}
                        />
                        <input
                          className={billCompactInputClass(Boolean(billFeeErrors[fee.id]?.value), "w-full text-right")}
                          type="number"
                          placeholder="0.00"
                          value={fee.value}
                          onChange={(event) => updateBillFee(fee.id, "value", event.target.value)}
                        />
                        <div className="flex justify-end">
                          <IconActionButton icon={<TrashIcon className="h-4 w-4" />} label={t("common.delete")} onClick={() => removeBillFee(fee.id)} size="sm" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {billFormError ? <InlineMessage tone="error">{billFormError}</InlineMessage> : null}
          </div>

          <div className="lg:sticky lg:top-2 lg:self-start">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("bills.preview")}</div>
            <BillPreviewPanel preview={billEditorPreview} t={t} language={language} />
          </div>
        </div>
      </ModalDialog>
      <ModalDialog
        open={Boolean(viewingBillId)}
        title={viewingBillQuery.data?.storeName ?? t("bills.moduleBody")}
        onClose={() => setViewingBillId(null)}
        className="sm:max-w-4xl"
      >
        {viewingBillQuery.isPending ? (
          <LoadingState lines={3} />
        ) : viewingBillQuery.isError ? (
          <InlineMessage tone="error">{getErrorMessage(viewingBillQuery.error)}</InlineMessage>
        ) : viewingBillPreview ? (
          <BillPreviewPanel preview={viewingBillPreview} t={t} language={language} />
        ) : null}
      </ModalDialog>

      <ModalDialog
        open={Boolean(settlementReceiptParticipantId)}
        title={settlementReceiptParticipant?.name ?? t("groups.viewAction")}
        onClose={() => setSettlementReceiptParticipantId(null)}
        className="sm:max-w-5xl"
      >
        <SettlementReceiptBreakdown
          error={settlementReceiptBillsQuery.error}
          isLoading={settlementReceiptBillsQuery.isPending}
          receipt={settlementReceiptData}
          t={t}
        />
      </ModalDialog>

      <ConfirmDialog
        open={isStartSettlementOpen}
        title={t("groups.startSettlementTitle")}
        description={t("groups.startSettlementBody")}
        details={group?.name ?? ""}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("groups.startSettlementAction")}
        error={statusActionError}
        isBusy={updateStatusMutation.isPending}
        onClose={() => {
          setStatusActionError(null);
          setIsStartSettlementOpen(false);
        }}
        onConfirm={() => updateStatusMutation.mutate("settling")}
      />

      <ConfirmDialog
        open={isMarkSettledOpen}
        title={t("groups.markSettledTitle")}
        description={t("groups.markSettledBody")}
        details={group?.name ?? ""}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("groups.markSettledAction")}
        error={statusActionError}
        isBusy={updateStatusMutation.isPending}
        onClose={() => {
          setStatusActionError(null);
          setIsMarkSettledOpen(false);
        }}
        onConfirm={() => updateStatusMutation.mutate("settled")}
      />

      {!isGuest && groupId && canEditGroup ? (
        <SettlementShareDialog
          open={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          groupId={groupId}
          groupName={group?.name}
          creatorName={group?.createdByUserName ?? undefined}
          fromDate=""
          toDate=""
          hasInvalidDateRange={false}
          groupStatus={group?.status}
          participants={participants}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deletingBillId)}
        title={t("bills.deleteTitle")}
        description={t("bills.deleteBody")}
        details={bills.find((bill) => bill.id === deletingBillId)?.storeName ?? ""}
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

      <EditNameDialog
        open={Boolean(editingParticipantId)}
        title={t("participants.editTitle")}
        description={t("participants.editBody")}
        initialValue={participants.find((participant) => participant.id === editingParticipantId)?.name ?? ""}
        placeholder={t("participants.placeholder")}
        cancelLabel={t("common.cancel")}
        submitLabel={t("common.saveChanges")}
        validationMessage={t("participants.nameRequired")}
        validateInput={(value) => value.includes("@") ? t("participants.editInviteBlocked") : null}
        error={editError}
        isBusy={updateParticipantMutation.isPending}
        onClose={() => {
          setEditError(null);
          setEditingParticipantId(null);
        }}
        onSubmit={(value) => updateParticipantMutation.mutate(value)}
      />

      <ConfirmDialog
        open={Boolean(deletingParticipantId)}
        title={t("participants.deleteTitle")}
        description={t("participants.deleteBody")}
        details={participants.find((participant) => participant.id === deletingParticipantId)?.name ?? ""}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("common.delete")}
        error={deleteError}
        isBusy={deleteParticipantMutation.isPending}
        onClose={() => {
          setDeleteError(null);
          setDeletingParticipantId(null);
        }}
        onConfirm={() => deleteParticipantMutation.mutate()}
      />
    </div>
  );
}

function getSettlementReceiptBillsQueryKey(
  groupId: string | undefined,
  participantId: string | null,
  bills: Array<{ id: string }>
) {
  return [
    "group-detail-bill-details",
    groupId,
    participantId,
    bills.map((bill) => bill.id).join(",")
  ] as const;
}

function getParticipantPaymentStatus(
  outgoingTransfers: Array<{ status: number }>,
  incomingTransfers: Array<{ status: number }>
) {
  const relevantTransfers = outgoingTransfers.length > 0 ? outgoingTransfers : incomingTransfers;
  if (relevantTransfers.some((transfer) => isSettlementUnpaid(transfer.status as 0 | 1 | 2))) {
    return SETTLEMENT_STATUS.unpaid;
  }

  if (relevantTransfers.some((transfer) => isSettlementPaid(transfer.status as 0 | 1 | 2))) {
    return SETTLEMENT_STATUS.paid;
  }

  return SETTLEMENT_STATUS.received;
}

function paymentStatusLabel(status: 0 | 1 | 2, t: (key: any) => string) {
  return ({
    [SETTLEMENT_STATUS.unpaid]: t("settlement.statusUnpaid"),
    [SETTLEMENT_STATUS.paid]: t("settlement.statusPaid"),
    [SETTLEMENT_STATUS.received]: t("settlement.statusReceivedShort")
  }[status]);
}

function paymentStatusTone(status: 0 | 1 | 2) {
  return ({
    [SETTLEMENT_STATUS.unpaid]: "bg-amber text-ink",
    [SETTLEMENT_STATUS.paid]: "bg-sky text-brand",
    [SETTLEMENT_STATUS.received]: "bg-mint text-success"
  }[status]);
}

function createSummaryImageFileName() {
  const uniqueId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `summary-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${uniqueId}-summary.png`;
}

function mapBillDetailToPreview(bill: BillDetailDto, participantNameById: Record<string, string>): BillPreviewData {
  return {
    storeName: bill.storeName,
    transactionDateUtc: bill.transactionDateUtc,
    primaryPayerName: participantNameById[bill.primaryPayerParticipantId] ?? "-",
    referenceImageDataUrl: bill.referenceImageDataUrl ?? "",
    items: bill.items.map((item) => ({
      id: item.id,
      description: item.description,
      amount: item.amount,
      responsibleParticipants: item.responsibleParticipants.map((participant) => ({
        participantId: participant.participantId,
        participantName: participant.participantName
      }))
    })),
    fees: bill.fees.map((fee) => ({
      id: fee.id,
      name: fee.name,
      feeType: fee.feeType,
      value: fee.value,
      appliedAmount: fee.appliedAmount
    })),
    subtotalAmount: bill.subtotalAmount,
    totalFeeAmount: bill.totalFeeAmount,
    grandTotalAmount: bill.grandTotalAmount
  };
}

function BillPreviewPanel({
  preview,
  t,
  language
}: {
  preview: BillPreviewData;
  t: (key: any) => string;
  language: "en" | "zh";
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[18px] border border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted">{t("bills.store")}</span><span className="text-sm font-semibold text-ink">{preview.storeName || "-"}</span></div>
          <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted">{t("bills.date")}</span><span className="text-sm font-semibold text-ink">{preview.transactionDateUtc ? formatDate(preview.transactionDateUtc, language) : "-"}</span></div>
          <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted">{t("bills.primaryPayer")}</span><span className="text-sm font-semibold text-ink">{preview.primaryPayerName}</span></div>
        </div>
      </div>

      {preview.referenceImageDataUrl ? (
        <div className="rounded-[18px] border border-slate-100 bg-slate-50/80 px-4 py-4">
          <div className="mb-3 text-sm font-semibold text-ink">{t("bills.reference")}</div>
          <img alt={t("bills.reference")} className="max-h-72 w-full rounded-[14px] object-contain" src={preview.referenceImageDataUrl} />
        </div>
      ) : null}

      <div className="rounded-[18px] border border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="mb-3 text-sm font-semibold text-ink">{t("bills.lineItems")}</div>
        <div className="space-y-3">
          {preview.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-start gap-2">
                <div className="text-sm font-semibold text-ink">{item.description}</div>

                <div className="flex flex-wrap gap-2">
                  {item.responsibleParticipants.map((participant) => (
                    <span
                      key={`${item.id}-${participant.participantId}`}
                      className="tag border border-slate-200 bg-white text-muted"
                    >
                      {participant.participantName}
                    </span>
                  ))}
                </div>
              </div>

              <div className="shrink-0 text-sm font-semibold text-ink">
                {formatCurrency(item.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[18px] border border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="mb-3 text-sm font-semibold text-ink">{t("bills.fees")}</div>
        {preview.fees.length === 0 ? (
          <div className="text-sm text-muted">{t("bills.noFee")}</div>
        ) : (
          <div className="space-y-2">
            {preview.fees.map((fee) => (
              <div key={fee.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink">
                  {fee.name} · {fee.feeType === 1 ? `${fee.value}%` : formatCurrency(fee.value)}
                </span>
                <span className="font-semibold text-ink">{formatCurrency(fee.appliedAmount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[18px] border border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted">{t("bills.subtotal")}</span><span className="text-sm font-semibold text-ink">{formatCurrency(preview.subtotalAmount)}</span></div>
          <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted">{t("bills.fees")}</span><span className="text-sm font-semibold text-ink">{formatCurrency(preview.totalFeeAmount)}</span></div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2"><span className="text-sm text-muted">{t("bills.total")}</span><span className="text-base font-semibold text-ink">{formatCurrency(preview.grandTotalAmount)}</span></div>
        </div>
      </div>
    </div>
  );
}
