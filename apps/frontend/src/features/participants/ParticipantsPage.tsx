import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@api-client";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { GroupStatusBadge, isGroupLocked } from "@/shared/groups/groupMeta";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { EditNameDialog } from "@/shared/ui/EditNameDialog";
import { ModalDialog } from "@/shared/ui/dialog";
import { EmptyState, IconActionButton, InlineMessage, LoadingSpinner, LoadingState, PageHeading, SectionCard, StatTile } from "@/shared/ui/primitives";
import { PencilIcon, PlusIcon, TrashIcon, UsersIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";
import { getErrorMessage, getInitials } from "@/shared/utils/format";

export function ParticipantsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [draftNames, setDraftNames] = useState([""]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingParticipantId, setDeletingParticipantId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { showToast } = useToast();

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

  const createMutation = useMutation({
    mutationFn: async (names: string[]) => {
      if (!groupId) {
        throw new Error(t("participants.editMissing"));
      }

      await Promise.all(names.map((name) => apiClient.createParticipant(groupId, name)));
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["participants", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["bills", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["settlements", groupId] })
      ]);
      setDraftNames([""]);
      setCreateError(null);
      setIsCreateDialogOpen(false);
      showToast({
        title: t("participants.addDialogTitle"),
        description: t("feedback.created"),
        tone: "success"
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : getErrorMessage(error);
      setCreateError(message);
      showToast({
        title: t("feedback.requestFailed"),
        description: message,
        tone: "error"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (nextName: string) => {
      if (!groupId || !editingParticipantId) {
        throw new Error(t("participants.editMissing"));
      }

      const duplicate = (participantsQuery.data ?? []).some(
        (participant) =>
          participant.id !== editingParticipantId &&
          participant.name.trim().toLocaleLowerCase() === nextName.toLocaleLowerCase()
      );

      if (duplicate) {
        throw new Error(t("participants.nameDuplicate"));
      }

      return apiClient.updateParticipant(groupId, editingParticipantId, { name: nextName });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["participants", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["bills", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["settlements", groupId] })
      ]);
      setEditError(null);
      setEditingParticipantId(null);
      showToast({
        title: t("participants.editTitle"),
        description: t("feedback.saved"),
        tone: "success"
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : getErrorMessage(error);
      setEditError(message);
      showToast({
        title: t("feedback.requestFailed"),
        description: message,
        tone: "error"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
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
      showToast({
        title: t("participants.deleteTitle"),
        description: t("feedback.deleted"),
        tone: "success"
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : getErrorMessage(error);
      setDeleteError(message);
      showToast({
        title: t("feedback.requestFailed"),
        description: message,
        tone: "error"
      });
    }
  });

  const isLocked = groupQuery.data ? isGroupLocked(groupQuery.data.status) : false;

  function openCreateDialog() {
    if (isLocked) {
      return;
    }

    setDraftNames([""]);
    setCreateError(null);
    setIsCreateDialogOpen(true);
  }

  function closeCreateDialog() {
    if (createMutation.isPending) {
      return;
    }

    setDraftNames([""]);
    setCreateError(null);
    setIsCreateDialogOpen(false);
  }

  function updateDraftName(index: number, value: string) {
    setDraftNames((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
    if (createError) {
      setCreateError(null);
    }
  }

  function addDraftRow() {
    setDraftNames((current) => [...current, ""]);
  }

  function removeDraftRow(index: number) {
    setDraftNames((current) => {
      if (current.length === 1) {
        return [""];
      }

      return current.filter((_, itemIndex) => itemIndex !== index);
    });

    if (createError) {
      setCreateError(null);
    }
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!groupId || createMutation.isPending || isLocked) {
      return;
    }

    const normalizedNames = draftNames.map((name) => name.trim());
    const existingNames = new Set(
      (participantsQuery.data ?? []).map((participant) => participant.name.trim().toLocaleLowerCase())
    );
    const seenDraftNames = new Set<string>();

    for (const name of normalizedNames) {
      if (!name) {
        setCreateError(t("participants.nameRequired"));
        return;
      }

      const key = name.toLocaleLowerCase();
      if (existingNames.has(key) || seenDraftNames.has(key)) {
        setCreateError(t("participants.nameDuplicate"));
        return;
      }

      seenDraftNames.add(key);
    }

    setCreateError(null);
    createMutation.mutate(normalizedNames);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
      <SectionCard id="participants-summary" className="p-6">
        <PageHeading
          eyebrow={groupQuery.data?.name ?? t("nav.participants")}
          title={groupQuery.data ? `${groupQuery.data.name} · ${t("participants.title")}` : t("participants.title")}
          description={t("participants.subtitle")}
          actions={!isLocked ? (
            <button className="button-primary" onClick={openCreateDialog} type="button">
              <PlusIcon className="h-4 w-4" />
              {t("participants.addAction")}
            </button>
          ) : undefined}
        />

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <StatTile
            label={t("participants.countLabel")}
            value={String(participantsQuery.data?.length ?? 0).padStart(2, "0")}
            icon={<UsersIcon className="h-5 w-5" />}
            tone="brand"
          />
          <div className="surface-muted p-4">
            <div className="text-sm font-semibold text-ink">{t("participants.groupLabel")}</div>
            <p className="mt-2 text-base font-semibold tracking-tight text-ink">{groupQuery.data?.name ?? "..."}</p>
            {groupQuery.data ? (
              <div className="mt-3">
                <GroupStatusBadge status={groupQuery.data.status} t={t} />
              </div>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-muted">{t("participants.groupBody")}</p>
          </div>
        </div>

        <div className="mt-6 rounded-[22px] border border-dashed border-slate-200 bg-slate-50/75 px-4 py-4 text-sm leading-6 text-muted">
          {isLocked ? t("groups.readOnlyParticipants") : t("participants.addDialogBody")}
        </div>

        {isLocked ? (
          <div className="mt-4">
            <InlineMessage tone="info">{t("groups.readOnlyParticipants")}</InlineMessage>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard id="participant-list" className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">{t("participants.title")}</h2>
            <p className="mt-2 section-copy">{t("participants.listBody")}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="tag bg-mint text-success">
              {participantsQuery.data?.length ?? 0} {t("nav.participants")}
            </span>
            {!isLocked ? (
              <button className="button-secondary" onClick={openCreateDialog} type="button">
                {t("participants.addAction")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          {groupQuery.isError ? (
            <InlineMessage
              tone="error"
              title={t("feedback.loadFailed")}
              action={(
                <button className="button-secondary" onClick={() => groupQuery.refetch()} type="button">
                  {t("common.retry")}
                </button>
              )}
            >
              {getErrorMessage(groupQuery.error)}
            </InlineMessage>
          ) : participantsQuery.isError ? (
            <InlineMessage
              tone="error"
              title={t("feedback.loadFailed")}
              action={(
                <button className="button-secondary" onClick={() => participantsQuery.refetch()} type="button">
                  {t("common.retry")}
                </button>
              )}
            >
              {getErrorMessage(participantsQuery.error)}
            </InlineMessage>
          ) : participantsQuery.isPending ? (
            <LoadingState lines={4} />
          ) : (participantsQuery.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<UsersIcon className="h-6 w-6" />}
              title={t("participants.emptyTitle")}
              description={t("participants.emptyBody")}
              action={!isLocked ? (
                <button className="button-secondary" onClick={openCreateDialog} type="button">
                  {t("participants.addAction")}
                </button>
              ) : undefined}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {participantsQuery.data?.map((participant, index) => (
                <article key={participant.id} className="list-card">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky text-sm font-semibold text-brand">
                      {getInitials(participant.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-semibold tracking-tight text-ink">{participant.name}</div>
                      <div className="mt-1 text-sm text-muted">#{String(index + 1).padStart(2, "0")}</div>
                    </div>
                    {!isLocked ? (
                      <>
                        <IconActionButton
                          icon={<PencilIcon className="h-4 w-4" />}
                          label={t("participants.editAction")}
                          onClick={() => {
                            setEditError(null);
                            setEditingParticipantId(participant.id);
                          }}
                          size="sm"
                        />
                        <IconActionButton
                          className="text-danger hover:border-rose-200 hover:bg-rose-50 hover:text-danger"
                          icon={<TrashIcon className="h-4 w-4" />}
                          label={t("participants.deleteAction")}
                          onClick={() => {
                            setDeleteError(null);
                            setDeletingParticipantId(participant.id);
                          }}
                          size="sm"
                        />
                      </>
                    ) : null}
                    <span className="tag bg-slate-100 text-muted">#{participant.id.slice(0, 4)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      <ModalDialog
        open={isCreateDialogOpen}
        title={t("participants.addDialogTitle")}
        description={t("participants.addDialogBody")}
        onClose={closeCreateDialog}
        actions={(
          <>
            <button className="button-secondary" disabled={createMutation.isPending} onClick={closeCreateDialog} type="button">
              {t("common.cancel")}
            </button>
            <button className="button-primary" disabled={createMutation.isPending} form="participants-create-form" type="submit">
              {createMutation.isPending ? <LoadingSpinner /> : null}
              {t("participants.addSubmit")}
            </button>
          </>
        )}
      >
        <form id="participants-create-form" className="space-y-4" onSubmit={handleCreateSubmit}>
          <div className="space-y-3">
            {draftNames.map((draftName, index) => (
              <div key={`participant-draft-${index}`} className="flex items-center gap-3">
                <div className="flex h-11 min-w-11 items-center justify-center rounded-2xl bg-slate-100 px-3 text-sm font-semibold text-muted">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <input
                  autoFocus={index === 0}
                  className={[
                    "input-base flex-1",
                    createError ? "border-danger focus:border-danger focus:ring-danger/10" : ""
                  ].join(" ")}
                  aria-invalid={Boolean(createError)}
                  placeholder={t("participants.modalPlaceholder")}
                  value={draftName}
                  onChange={(event) => updateDraftName(index, event.target.value)}
                />
                <IconActionButton
                  disabled={createMutation.isPending || draftNames.length === 1}
                  icon={<TrashIcon className="h-4 w-4" />}
                  label={t("participants.removeRow")}
                  onClick={() => removeDraftRow(index)}
                  size="sm"
                />
              </div>
            ))}
          </div>

          {createError ? <InlineMessage tone="error">{createError}</InlineMessage> : null}

          <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
            <button className="button-secondary" disabled={createMutation.isPending} onClick={addDraftRow} type="button">
              {t("participants.addRow")}
            </button>
            <span className="text-sm leading-6 text-muted">{t("participants.modalHint")}</span>
          </div>
        </form>
      </ModalDialog>

      <EditNameDialog
        open={Boolean(editingParticipantId)}
        title={t("participants.editTitle")}
        description={t("participants.editBody")}
        initialValue={(participantsQuery.data ?? []).find((participant) => participant.id === editingParticipantId)?.name ?? ""}
        placeholder={t("participants.placeholder")}
        cancelLabel={t("common.cancel")}
        submitLabel={t("common.saveChanges")}
        validationMessage={t("participants.nameRequired")}
        error={editError}
        isBusy={updateMutation.isPending}
        onClose={() => {
          setEditError(null);
          setEditingParticipantId(null);
        }}
        onSubmit={(value) => updateMutation.mutate(value)}
      />
      <ConfirmDialog
        open={Boolean(deletingParticipantId)}
        title={t("participants.deleteTitle")}
        description={t("participants.deleteBody")}
        details={(participantsQuery.data ?? []).find((participant) => participant.id === deletingParticipantId)?.name ?? ""}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("common.delete")}
        error={deleteError}
        isBusy={deleteMutation.isPending}
        onClose={() => {
          setDeleteError(null);
          setDeletingParticipantId(null);
        }}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
