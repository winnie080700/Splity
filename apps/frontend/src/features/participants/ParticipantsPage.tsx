import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { apiClient } from "@api-client";
import { useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { getErrorMessage, getInitials } from "@/shared/utils/format";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { EditNameDialog } from "@/shared/ui/EditNameDialog";
import { EmptyState, IconActionButton, InlineMessage, LoadingSpinner, LoadingState, PageHeading, SectionCard, StatTile } from "@/shared/ui/primitives";
import { PencilIcon, PlusIcon, TrashIcon, UsersIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";

export function ParticipantsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingParticipantId, setDeletingParticipantId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
    mutationFn: () => apiClient.createParticipant(groupId!, name.trim()),
    onSuccess: async () => {
      setName("");
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["participants", groupId] });
      inputRef.current?.focus();
      showToast({
        title: t("participants.title"),
        description: t("feedback.created"),
        tone: "success"
      });
    },
    onError: (error) => {
      showToast({
        title: t("feedback.requestFailed"),
        description: getErrorMessage(error),
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!groupId || createMutation.isPending) {
      return;
    }

    const trimmedName = name.trim();
    const duplicate = (participantsQuery.data ?? []).some(
      (participant) => participant.name.trim().toLocaleLowerCase() === trimmedName.toLocaleLowerCase()
    );

    if (!trimmedName) {
      setFormError(t("participants.nameRequired"));
      inputRef.current?.focus();
      return;
    }

    if (duplicate) {
      setFormError(t("participants.nameDuplicate"));
      inputRef.current?.focus();
      return;
    }

    setFormError(null);
    createMutation.mutate();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
      <SectionCard id="add-participant" className="p-6">
        <PageHeading
          eyebrow={groupQuery.data?.name ?? t("nav.participants")}
          title={groupQuery.data ? `${groupQuery.data.name} · ${t("participants.title")}` : t("participants.title")}
          description={t("participants.subtitle")}
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
            <p className="mt-2 text-sm leading-6 text-muted">{t("participants.groupBody")}</p>
          </div>
        </div>

        <form
          className="mt-6 flex items-start gap-3"
          onSubmit={handleSubmit}
        >
          <input
            ref={inputRef}
            className={[
              "input-base flex-1",
              formError ? "border-danger focus:border-danger focus:ring-danger/10" : ""
            ].join(" ")}
            aria-invalid={Boolean(formError)}
            placeholder={t("participants.placeholder")}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (formError) {
                setFormError(null);
              }
            }}
          />
          <IconActionButton
            disabled={createMutation.isPending || !name.trim()}
            icon={createMutation.isPending ? <LoadingSpinner /> : <PlusIcon className="h-4 w-4" />}
            label={createMutation.isPending ? `${t("participants.add")}...` : t("participants.add")}
            type="submit"
            variant="primary"
          />
        </form>

        {formError ? (
          <div className="mt-3">
            <InlineMessage tone="error">{formError}</InlineMessage>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard id="participant-list" className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">{t("participants.title")}</h2>
            <p className="mt-2 section-copy">{t("participants.subtitle")}</p>
          </div>
          <span className="tag bg-mint text-success">
            {participantsQuery.data?.length ?? 0} {t("nav.participants")}
          </span>
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
              action={(
                <button className="button-secondary" onClick={() => inputRef.current?.focus()} type="button">
                  {t("common.focusInput")}
                </button>
              )}
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
                    <span className="tag bg-slate-100 text-muted">#{participant.id.slice(0, 4)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

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
