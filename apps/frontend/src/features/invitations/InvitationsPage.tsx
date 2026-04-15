import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@api-client";
import { useAuth } from "@/shared/auth/AuthProvider";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { EmptyState, IconActionButton, InlineMessage, LoadingSpinner, LoadingState, PageHeading, SectionCard } from "@/shared/ui/primitives";
import { CheckIcon, MailIcon, TrashIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";
import { formatDate, getErrorMessage } from "@/shared/utils/format";

export function InvitationsPage() {
  const queryClient = useQueryClient();
  const { t, language } = useI18n();
  const { isGuest } = useAuth();
  const { showToast } = useToast();

  const invitationsQuery = useQuery({
    queryKey: ["invitations"],
    queryFn: () => apiClient.listInvitations(),
    enabled: !isGuest
  });

  const acceptMutation = useMutation({
    mutationFn: (participantId: string) => apiClient.acceptInvitation(participantId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invitations"] }),
        queryClient.invalidateQueries({ queryKey: ["groups"] }),
        queryClient.invalidateQueries({ queryKey: ["participants"] })
      ]);
      showToast({ title: t("invitations.acceptAction"), description: t("feedback.saved"), tone: "success" });
    },
    onError: (error) => {
      showToast({ title: t("feedback.requestFailed"), description: getErrorMessage(error), tone: "error" });
    }
  });

  const declineMutation = useMutation({
    mutationFn: (participantId: string) => apiClient.declineInvitation(participantId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invitations"] }),
        queryClient.invalidateQueries({ queryKey: ["groups"] }),
        queryClient.invalidateQueries({ queryKey: ["participants"] })
      ]);
      showToast({ title: t("invitations.declineAction"), description: t("feedback.saved"), tone: "success" });
    },
    onError: (error) => {
      showToast({ title: t("feedback.requestFailed"), description: getErrorMessage(error), tone: "error" });
    }
  });

  const isMutating = acceptMutation.isPending || declineMutation.isPending;

  return (
    <SectionCard className="p-6 md:p-7">
      <PageHeading
        eyebrow={t("nav.invitations")}
        title={t("invitations.title")}
        description={t("invitations.body")}
      />

      {isGuest ? (
        <div className="mt-6">
          <InlineMessage tone="info">{t("invitations.guestBody")}</InlineMessage>
        </div>
      ) : null}

      {!isGuest ? (
        <div className="mt-6">
          {invitationsQuery.isPending ? (
            <LoadingState lines={3} />
          ) : invitationsQuery.isError ? (
            <InlineMessage
              tone="error"
              title={t("feedback.loadFailed")}
              action={(
                <button className="button-secondary" onClick={() => invitationsQuery.refetch()} type="button">
                  {t("common.retry")}
                </button>
              )}
            >
              {getErrorMessage(invitationsQuery.error)}
            </InlineMessage>
          ) : (invitationsQuery.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<MailIcon className="h-6 w-6" />}
              title={t("invitations.emptyTitle")}
              description={t("invitations.emptyBody")}
            />
          ) : (
            <div className="space-y-3">
              {invitationsQuery.data?.map((invitation) => (
                <article key={invitation.participantId} className="list-card">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="text-base font-semibold tracking-tight text-ink">{invitation.groupName}</div>
                      <div className="text-sm text-muted">
                        {t("invitations.invitedAs")} {invitation.participantName}
                        {invitation.participantUsername ? ` (@${invitation.participantUsername})` : ""}
                      </div>
                      <div className="text-sm text-muted">
                        {t("invitations.invitedBy")} {invitation.invitedByName}
                      </div>
                      <div className="text-xs text-muted">
                        {t("invitations.invitedOn")} {formatDate(invitation.invitedAtUtc, language)}
                      </div>
                    </div>

                    <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                      <IconActionButton
                        disabled={isMutating}
                        icon={<CheckIcon className="h-4 w-4 text-success" />}
                        label={t("invitations.acceptAction")}
                        onClick={() => acceptMutation.mutate(invitation.participantId)}
                        size="sm"
                      />
                      <IconActionButton
                        disabled={isMutating}
                        icon={<TrashIcon className="h-4 w-4 text-danger" />}
                        label={t("invitations.declineAction")}
                        onClick={() => declineMutation.mutate(invitation.participantId)}
                        size="sm"
                      />
                      {isMutating ? <LoadingSpinner /> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </SectionCard>
  );
}
