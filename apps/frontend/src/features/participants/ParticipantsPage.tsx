import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { apiClient } from "@api-client";
import { useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { getErrorMessage, getInitials } from "@/shared/utils/format";
import { EmptyState, InlineMessage, LoadingSpinner, LoadingState, PageHeading, SectionCard, StatTile } from "@/shared/ui/primitives";
import { PlusIcon, UsersIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";

export function ParticipantsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { showToast } = useToast();

  const participantsQuery = useQuery({
    queryKey: ["participants", groupId],
    queryFn: () => apiClient.listParticipants(groupId!),
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
      <SectionCard className="p-6">
        <PageHeading
          eyebrow={t("nav.participants")}
          title={t("participants.title")}
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
            <div className="text-sm font-semibold text-ink">{t("home.tip")}</div>
            <p className="mt-2 text-sm leading-6 text-slate">{t("home.quickStart2")}</p>
          </div>
        </div>

        <form
          className="mt-6 flex flex-col gap-3 sm:flex-row"
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
          <button className="button-primary min-w-[132px]" disabled={createMutation.isPending || !name.trim()} type="submit">
            {createMutation.isPending ? <LoadingSpinner /> : <PlusIcon className="h-4 w-4" />}
            {createMutation.isPending ? `${t("participants.add")}...` : t("participants.add")}
          </button>
        </form>

        {formError ? (
          <div className="mt-3">
            <InlineMessage tone="error">{formError}</InlineMessage>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard className="p-6">
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
          {participantsQuery.isError ? (
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
                      <div className="mt-1 text-sm text-slate">#{String(index + 1).padStart(2, "0")}</div>
                    </div>
                    <span className="tag bg-slate-100 text-slate">#{participant.id.slice(0, 4)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
