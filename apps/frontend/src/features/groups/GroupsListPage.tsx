import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@api-client";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatGroupCreatedAt, GroupStatusBadge, isGroupLocked } from "@/shared/groups/groupMeta";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { EditNameDialog } from "@/shared/ui/EditNameDialog";
import {
  EmptyState,
  IconActionButton,
  IconActionLink,
  InlineMessage,
  LoadingState,
  SectionCard
} from "@/shared/ui/primitives";
import { EyeIcon, PencilIcon, PlusIcon, TrashIcon, UsersIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/utils/format";

export function GroupsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language } = useI18n();
  const { showToast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiClient.listGroups()
  });

  const groups = groupsQuery.data ?? [];
  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const participantQueries = useQueries({
    queries: groups.map((group) => ({
      queryKey: ["participants", group.id],
      queryFn: () => apiClient.listParticipants(group.id),
      enabled: groups.length > 0
    }))
  });

  const billQueries = useQueries({
    queries: groups.map((group) => ({
      queryKey: ["bills", group.id],
      queryFn: () => apiClient.listBills(group.id),
      enabled: groups.length > 0
    }))
  });

  const createGroupMutation = useMutation({
    mutationFn: (name: string) => apiClient.createGroup(name),
    onSuccess: async (group) => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      setCreateError(null);
      setIsCreateOpen(false);
      navigate(`/groups/${group.id}`);
      showToast({ title: t("groups.createTitle"), description: t("feedback.created"), tone: "success" });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setCreateError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  const updateGroupMutation = useMutation({
    mutationFn: (name: string) => {
      if (!selectedGroupId) {
        throw new Error(t("groups.editMissingGroup"));
      }

      return apiClient.updateGroup(selectedGroupId, { name });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["groups"] }),
        queryClient.invalidateQueries({ queryKey: ["group", selectedGroupId] })
      ]);
      setEditError(null);
      setIsEditOpen(false);
      showToast({ title: t("groups.editTitle"), description: t("feedback.saved"), tone: "success" });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setEditError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: () => {
      if (!selectedGroupId) {
        throw new Error(t("groups.editMissingGroup"));
      }

      return apiClient.deleteGroup(selectedGroupId);
    },
    onSuccess: async () => {
      if (!selectedGroupId) {
        return;
      }

      const groupId = selectedGroupId;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["groups"] }),
        queryClient.removeQueries({ queryKey: ["group", groupId] }),
        queryClient.removeQueries({ queryKey: ["participants", groupId] }),
        queryClient.removeQueries({ queryKey: ["bills", groupId] }),
        queryClient.removeQueries({ queryKey: ["bill", groupId] }),
        queryClient.removeQueries({ queryKey: ["settlements", groupId] })
      ]);
      setDeleteError(null);
      setSelectedGroupId(null);
      setIsDeleteOpen(false);
      showToast({ title: t("groups.deleteTitle"), description: t("feedback.deleted"), tone: "success" });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setDeleteError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  function openEditDialog(groupId: string) {
    setSelectedGroupId(groupId);
    setEditError(null);
    setIsEditOpen(true);
  }

  function openDeleteDialog(groupId: string) {
    setSelectedGroupId(groupId);
    setDeleteError(null);
    setIsDeleteOpen(true);
  }

  function getCountValue(index: number, queries: typeof participantQueries | typeof billQueries) {
    const query = queries[index];

    if (!query) {
      return "—";
    }

    if (query.isPending) {
      return "...";
    }

    if (query.isError) {
      return "—";
    }

    return String(query.data?.length ?? 0);
  }

  function renderContent() {
    if (groupsQuery.isPending) {
      return <LoadingState lines={4} />;
    }

    if (groupsQuery.isError) {
      return (
        <InlineMessage
          tone="error"
          title={t("feedback.loadFailed")}
          action={(
            <button className="button-secondary" onClick={() => groupsQuery.refetch()} type="button">
              {t("common.retry")}
            </button>
          )}
        >
          {getErrorMessage(groupsQuery.error)}
        </InlineMessage>
      );
    }

    if (groups.length === 0) {
      return (
        <EmptyState
          icon={<UsersIcon className="h-6 w-6" />}
          title={t("groups.listEmptyTitle")}
          description={t("groups.listEmptyBody")}
          action={(
            <button
              className="button-secondary"
              onClick={() => {
                setCreateError(null);
                setIsCreateOpen(true);
              }}
              type="button"
            >
              {t("groups.createAction")}
            </button>
          )}
        />
      );
    }

    return (
      <div className="dashboard-activity-table overflow-x-auto">
        <div className="dashboard-activity-table-header groups-list-table-header min-w-[390px] sm:min-w-[740px]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t("groups.columnName")}</div>
          <div className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-muted sm:block">{t("groups.columnCreated")}</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t("groups.columnStatus")}</div>
          <div className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-muted sm:block">{t("groups.participantCount")}</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t("groups.billCount")}</div>
          <div className="text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t("groups.columnActions")}</div>
        </div>
        <ul className="min-w-[390px] sm:min-w-[740px]">
          {groups.map((group, index) => (
            <li key={group.id}>
              <div className="dashboard-activity-table-row groups-list-table-row">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">{group.name}</div>
                </div>
                <div className="hidden text-sm text-muted sm:block">{formatGroupCreatedAt(group.createdAtUtc, language)}</div>
                <div>
                  <GroupStatusBadge status={group.status} t={t} />
                </div>
                <div className="hidden text-sm text-ink sm:block">{getCountValue(index, participantQueries)}</div>
                <div className="text-sm text-ink">{getCountValue(index, billQueries)}</div>
                <div className="flex items-center justify-end gap-2">
                  <IconActionLink
                    icon={<EyeIcon className="h-4 w-4" />}
                    label={t("groups.viewAction")}
                    size="sm"
                    to={`/groups/${group.id}`}
                  />
                  <IconActionButton
                    disabled={isGroupLocked(group.status)}
                    icon={<PencilIcon className="h-4 w-4" />}
                    label={t("groups.editAction")}
                    onClick={() => openEditDialog(group.id)}
                    size="sm"
                  />
                  <IconActionButton
                    icon={<TrashIcon className="h-4 w-4" />}
                    label={t("groups.deleteAction")}
                    onClick={() => openDeleteDialog(group.id)}
                    size="sm"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard className="p-6 md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="section-title">{t("groups.listTitle")}</h1>
            {/* <p className="mt-1 section-copy">{t("groups.listDescription")}</p> */}
          </div>
          <IconActionButton
            icon={<PlusIcon className="h-5 w-5" />}
            label={t("groups.createAction")}
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
          />
        </div>

        <div className="mt-6">{renderContent()}</div>
      </SectionCard>

      <EditNameDialog
        open={isCreateOpen}
        title={t("groups.createTitle")}
        description={t("groups.createBody")}
        initialValue=""
        placeholder={t("home.groupPlaceholder")}
        cancelLabel={t("common.cancel")}
        submitLabel={t("groups.createAction")}
        validationMessage={t("groups.nameRequired")}
        error={createError}
        isBusy={createGroupMutation.isPending}
        onClose={() => {
          setCreateError(null);
          setIsCreateOpen(false);
        }}
        onSubmit={(value) => createGroupMutation.mutate(value)}
      />

      <EditNameDialog
        open={isEditOpen}
        title={t("groups.editTitle")}
        description={t("groups.editBody")}
        initialValue={selectedGroup?.name ?? ""}
        placeholder={t("home.groupPlaceholder")}
        cancelLabel={t("common.cancel")}
        submitLabel={t("common.saveChanges")}
        validationMessage={t("groups.nameRequired")}
        error={editError}
        isBusy={updateGroupMutation.isPending}
        onClose={() => {
          setEditError(null);
          setIsEditOpen(false);
        }}
        onSubmit={(value) => updateGroupMutation.mutate(value)}
      />

      <ConfirmDialog
        open={isDeleteOpen}
        title={t("groups.deleteTitle")}
        description={t("groups.deleteBody")}
        details={selectedGroup?.name ?? ""}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("common.delete")}
        error={deleteError}
        isBusy={deleteGroupMutation.isPending}
        onClose={() => {
          setDeleteError(null);
          setIsDeleteOpen(false);
        }}
        onConfirm={() => deleteGroupMutation.mutate()}
      />
    </div>
  );
}
