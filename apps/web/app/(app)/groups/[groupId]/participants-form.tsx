"use client";

import { Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { T } from "@/components/i18n/t";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { useTranslation, type MessageKey } from "@/lib/i18n";
import { type InvitationStatus } from "@/lib/domain/status";
import type { Database } from "@/lib/supabase/database.types";
import {
  addParticipantAction,
  removeParticipantAction,
  renameParticipantAction,
  type ParticipantActionState,
} from "./participants/actions";
import { SectionTitle } from "@/components/ui/section-title";

type Participant = Database["public"]["Tables"]["participants"]["Row"];
type AddMode = "manual" | "invite";
type AddedParticipant = NonNullable<ParticipantActionState["added"]>;

const initialState: ParticipantActionState = {
  added: null,
  error: null,
  lookup: null,
  success: null,
};

function format(message: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, String(value)),
    message,
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S"
  );
}

function normalizeUsernameInput(username: string) {
  return username.trim().replace(/^@+/, "").trim().toLowerCase();
}

const participantStatusMeta: Partial<
  Record<
    number,
    {
      dot: string;
      labelKey: MessageKey;
      pill: string;
    }
  >
> = {
  1: {
    dot: "bg-[var(--splity-gold-strong)]",
    labelKey: "groupDetail.participantStatus.invited",
    pill: "bg-[#fff4d8] text-[var(--splity-gold-strong)]",
  },
  2: {
    dot: "bg-[var(--splity-mint)]",
    labelKey: "groupDetail.participantStatus.accepted",
    pill: "bg-emerald-50 text-[var(--splity-mint)]",
  },
  3: {
    dot: "bg-[var(--splity-rose)]",
    labelKey: "groupDetail.participantStatus.declined",
    pill: "bg-red-50 text-[var(--splity-rose)]",
  },
};

function Modal({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton({
  children,
  danger,
  disabled,
  icon,
  pendingLabel,
  value,
  variant = "primary",
}: {
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  pendingLabel: ReactNode;
  value?: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <PendingActionButton
      className={[
        "gap-2",
        danger
          ? "bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700"
          : "",
      ].join(" ")}
      disabled={disabled}
      pendingLabel={pendingLabel}
      name={value ? "intent" : undefined}
      type="submit"
      value={value}
      variant={variant}>
      {icon}
      {children}
    </PendingActionButton>
  );
}

export function ParticipantsForm({
  canEdit,
  creatorUserId,
  groupId,
  participants,
}: {
  canEdit: boolean;
  creatorUserId: string | null;
  groupId: string;
  participants: Participant[];
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("manual");
  const [manualName, setManualName] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteLookup, setInviteLookup] =
    useState<ParticipantActionState["lookup"]>(null);
  const [addedParticipants, setAddedParticipants] = useState<
    AddedParticipant[]
  >([]);
  const [addState, addAction] = useActionState(
    addParticipantAction.bind(null, groupId),
    initialState,
  );
  const router = useRouter();
  const { t } = useTranslation();
  const currentLookup =
    addMode === "invite" &&
    inviteLookup?.username === normalizeUsernameInput(inviteUsername)
      ? inviteLookup
      : null;

  useEffect(() => {
    if (addState.lookup) {
      setInviteLookup(addState.lookup);
    }
    if (addState.success) {
      toast.success(addState.success);
      router.refresh();
    }
    if (addState.error) toast.error(addState.error);
  }, [addState.error, addState.lookup, addState.success, router]);

  useEffect(() => {
    if (!addState.added) return;

    setAddedParticipants((current) =>
      [addState.added!, ...current].slice(0, 6),
    );
    setManualName("");
    setInviteUsername("");
    setInviteLookup(null);
  }, [addState.added]);

  return (
    <section className="rounded-2xl border border-[var(--splity-line)] bg-white p-4 shadow-[0_2px_8px_rgba(12,21,56,0.06)] sm:rounded-3xl sm:p-7">
      <div className="grid gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <SectionTitle
          badge={
            <T
              k="groupDetail.participantCount"
              values={{ count: participants.length }}
            />
          }
          kicker={<T k="groupDetail.participantsKicker" />}
          title={<T k="groupDetail.peopleInSplit" />}
        />

        <div className="grid gap-2 sm:flex sm:items-center">
          {!canEdit ? <Badge tone="amber">{t("groups.locked")}</Badge> : null}
          {canEdit ? (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--splity-navy)] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#15225a]"
              onClick={() => setIsAddOpen(true)}
              type="button">
              <Plus className="h-4 w-4" />
              {t("groups.addParticipant")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-3 lg:grid-cols-4">
        {participants.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyState
              description={t("groups.noParticipantsBody")}
              title={t("groups.noParticipantsTitle")}
            />
          </div>
        ) : (
          participants.map((participant, index) => (
            <ParticipantCard
              canEdit={canEdit}
              creatorUserId={creatorUserId}
              groupId={groupId}
              index={index}
              key={participant.id}
              participant={participant}
            />
          ))
        )}
      </div>

      {isAddOpen ? (
        <Modal
          onClose={() => setIsAddOpen(false)}
          title={t("groups.addParticipant")}>
          <form action={addAction} className="grid gap-4">
            <input name="mode" type="hidden" value={addMode} />
            {currentLookup ? (
              <input name="lookupId" type="hidden" value={currentLookup.id} />
            ) : null}
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--splity-navy)] text-[var(--splity-gold)]">
                <UserPlus className="h-4 w-4" />
              </span>
              <p className="text-sm leading-6 text-[var(--splity-muted)]">
                {t(
                  addMode === "manual"
                    ? "groupDetail.manualAddBody"
                    : "groupDetail.inviteAddBody",
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 rounded-xl border border-[var(--splity-line)] bg-[var(--splity-bg)] p-1 sm:rounded-full">
              {(["manual", "invite"] satisfies AddMode[]).map((mode) => (
                <button
                  className={[
                    "h-9 rounded-full text-sm font-bold transition",
                    addMode === mode
                      ? "bg-white text-[var(--splity-ink)] shadow-sm"
                      : "text-[var(--splity-muted)] hover:text-[var(--splity-ink)]",
                  ].join(" ")}
                  key={mode}
                  onClick={() => setAddMode(mode)}
                  type="button">
                  {t(
                    mode === "manual"
                      ? "groupDetail.addModeManual"
                      : "groupDetail.addModeInvite",
                  )}
                </button>
              ))}
            </div>

            {addMode === "manual" ? (
              <Input
                disabled={!canEdit}
                label={t("groups.name")}
                name="name"
                onChange={(event) => setManualName(event.target.value)}
                required
                value={manualName}
              />
            ) : (
              <Input
                autoCapitalize="none"
                disabled={!canEdit}
                label={t("settings.username")}
                name="username"
                onChange={(event) => setInviteUsername(event.target.value)}
                required
                value={inviteUsername}
              />
            )}

            {currentLookup ? (
              <div className="rounded-xl border border-[var(--splity-line)] bg-[var(--splity-bg)]/45 p-3 text-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--splity-gold-strong)]">
                  {t("groupDetail.inviteLookupReady")}
                </p>
                <p className="mt-2 font-bold text-[var(--splity-ink)]">
                  {currentLookup.name}
                </p>
                <p className="mt-1 text-[var(--splity-muted)]">
                  @{currentLookup.username}
                </p>
              </div>
            ) : null}

            {addState.error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {addState.error}
              </p>
            ) : null}

            {addedParticipants.length ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/65 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--splity-mint)]">
                  {t("groupDetail.recentlyAdded")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {addedParticipants.map((participant, participantIndex) => (
                    <span
                      className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--splity-ink)] shadow-sm"
                      key={`${participant.name}-${participant.username ?? "manual"}-${participantIndex}`}>
                      {participant.name}
                      {participant.username ? (
                        <span className="ml-1 text-[var(--splity-muted)]">
                          @{participant.username}
                        </span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                onClick={() => setIsAddOpen(false)}
                type="button"
                variant="secondary">
                {t("common.cancel")}
              </Button>
              {addMode === "invite" ? (
                <SubmitButton
                  disabled={!canEdit || !inviteUsername.trim()}
                  icon={<Search className="h-4 w-4" />}
                  pendingLabel={t("groups.checking")}
                  value="lookup"
                  variant="secondary">
                  {t("groups.lookup")}
                </SubmitButton>
              ) : null}
              <SubmitButton
                disabled={!canEdit || (addMode === "invite" && !currentLookup)}
                icon={<UserPlus className="h-4 w-4" />}
                pendingLabel={t("groups.adding")}>
                {t(
                  addMode === "manual"
                    ? "groups.addParticipant"
                    : "groupDetail.inviteParticipant",
                )}
              </SubmitButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}

function ParticipantCard({
  canEdit,
  creatorUserId,
  groupId,
  index,
  participant,
}: {
  canEdit: boolean;
  creatorUserId: string | null;
  groupId: string;
  index: number;
  participant: Participant;
}) {
  const [openModal, setOpenModal] = useState<"edit" | "delete" | null>(null);
  const [renameState, renameAction] = useActionState(
    renameParticipantAction.bind(null, groupId, participant.id),
    initialState,
  );
  const [removeState, removeAction] = useActionState(
    removeParticipantAction.bind(null, groupId, participant.id),
    initialState,
  );
  const router = useRouter();
  const status = participant.invitation_status as InvitationStatus;
  const { t } = useTranslation();
  const isOrganizer =
    participant.invited_user_id === creatorUserId || index === 0;
  const isInvitedParticipant = participant.invited_user_id !== null;
  const statusMeta = participantStatusMeta[status];

  useEffect(() => {
    if (renameState.success) {
      toast.success(renameState.success);
      setOpenModal(null);
      router.refresh();
    }
    if (renameState.error) toast.error(renameState.error);
  }, [renameState.error, renameState.success, router]);

  useEffect(() => {
    if (removeState.success) {
      toast.success(removeState.success);
      setOpenModal(null);
      router.refresh();
    }
    if (removeState.error) toast.error(removeState.error);
  }, [removeState.error, removeState.success, router]);

  return (
    <article className="group relative min-h-[70px] rounded-[14px] border border-[var(--splity-line)] bg-[#fffefa] px-4 py-3 shadow-[0_1px_0_rgba(12,21,56,0.03)] transition hover:border-[var(--splity-line-strong)] hover:shadow-[0_10px_24px_rgba(12,21,56,0.07)]">
      <div className="grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={[
              "splity-display inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] text-sm font-extrabold text-white",
              isOrganizer ? "bg-[var(--splity-navy)]" : "bg-[#c46920]",
            ].join(" ")}>
            {initials(participant.name)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-bold text-[var(--splity-ink)]">
                {participant.name}
              </p>
              {isOrganizer ? (
                <span className="rounded-full bg-[#fff4d8] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--splity-gold-strong)]">
                  {t("groupDetail.organizer")}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-xs font-medium text-[var(--splity-muted)]">
              {participant.username
                ? `@${participant.username}`
                : t("groups.manual").toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end">
          {statusMeta ? (
            <span
              className={[
                "inline-flex h-6 items-center gap-1.5 rounded-full px-3 text-[10px] font-extrabold uppercase tracking-[0.12em]",
                statusMeta.pill,
              ].join(" ")}>
              <span
                className={["h-1.5 w-1.5 rounded-full", statusMeta.dot].join(
                  " ",
                )}
              />
              {t(statusMeta.labelKey)}
            </span>
          ) : null}
        </div>
      </div>

      {canEdit ? (
        <div className="pointer-events-none absolute right-3 top-1/2 z-10 flex -translate-y-1/2 gap-1 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
          {!isInvitedParticipant ? (
            <button
              aria-label={format(t("groupDetail.editParticipantLabel"), {
                name: participant.name,
              })}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--splity-line)] bg-white text-[var(--splity-ink)] shadow-sm transition hover:bg-[var(--splity-bg)]"
              onClick={() => setOpenModal("edit")}
              type="button">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            aria-label={format(t("groupDetail.deleteParticipantTitle"), {
              name: participant.name,
            })}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 shadow-sm transition hover:bg-red-50"
            onClick={() => setOpenModal("delete")}
            type="button">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {openModal === "edit" && !isInvitedParticipant ? (
        <Modal
          onClose={() => setOpenModal(null)}
          title={format(t("groupDetail.editParticipantTitle"), {
            name: participant.name,
          })}>
          <form action={renameAction} className="grid gap-4">
            <Input
              defaultValue={participant.name}
              disabled={!canEdit}
              label={t("groups.name")}
              name="name"
              required
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setOpenModal(null)}
                type="button"
                variant="secondary">
                {t("common.cancel")}
              </Button>
              <SubmitButton
                disabled={!canEdit}
                pendingLabel={t("common.saving")}>
                {t("common.save")}
              </SubmitButton>
            </div>
          </form>
        </Modal>
      ) : null}

      {openModal === "delete" ? (
        <AlertDialog onOpenChange={(open) => !open && setOpenModal(null)} open>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {format(t("groupDetail.deleteParticipantTitle"), {
                  name: participant.name,
                })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("groupDetail.deleteParticipantBody")}
              </AlertDialogDescription>
            </AlertDialogHeader>
          <form action={removeAction} className="grid gap-4">
            <AlertDialogFooter>
              <Button
                onClick={() => setOpenModal(null)}
                type="button"
                variant="secondary">
                {t("common.cancel")}
              </Button>
              <SubmitButton
                danger
                disabled={!canEdit}
                pendingLabel={t("groups.removing")}>
                {t("common.remove")}
              </SubmitButton>
            </AlertDialogFooter>
          </form>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </article>
  );
}
