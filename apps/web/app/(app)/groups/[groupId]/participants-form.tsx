"use client";

import { CheckCircle2, Info, MoreVertical, Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { InviteLinkButton } from "./invite-link-button";

type Participant = Database["public"]["Tables"]["participants"]["Row"];
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
  const [addMode, setAddMode] = useState<"invite" | "manual">("manual");
  const [manualName, setManualName] = useState("");
  const [username, setUsername] = useState("");
  const [addedParticipants, setAddedParticipants] = useState<
    AddedParticipant[]
  >([]);
  const [addState, addAction] = useActionState(
    addParticipantAction.bind(null, groupId),
    initialState,
  );
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
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
    setUsername("");
  }, [addState.added]);

  const lookup =
    addState.lookup?.username.toLowerCase() === username.trim().replace(/^@+/, "").toLowerCase()
      ? addState.lookup
      : null;

  return (
    <section className="rounded-2xl border border-[var(--splity-line)] bg-white p-4 shadow-[0_2px_8px_rgba(12,21,56,0.06)] sm:rounded-3xl sm:p-7">
      <div className="grid gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="splity-display text-2xl font-bold tracking-tight text-[var(--splity-ink)]">
            {t("groupDetail.peopleInSplit")}
          </h2>
          <span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-bold text-[var(--splity-muted)]">
            {t("groupDetail.participantCount").replace("{count}", String(participants.length))}
          </span>
        </div>
        <div className="grid gap-2 sm:flex sm:items-center">
          {canEdit ? (
            <>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
                onClick={() => {
                  setIsAddOpen(true);
                }}
                type="button">
                <Plus className="h-4 w-4" />
                {t("groupDetail.addParticipant")}
              </button>
              <InviteLinkButton groupId={groupId} />
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
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

      <aside className="mt-6 flex items-start gap-4 rounded-xl border border-teal-200 bg-teal-50/45 px-5 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-teal-700">
          <Info className="h-5 w-5" />
        </span>
        <div>
          <p className="font-bold text-[var(--splity-ink)]">{t("groupDetail.permissionsTitle")}</p>
          <p className="mt-1 text-sm text-[var(--splity-muted)]">{t("groupDetail.permissionsBody")}</p>
        </div>
      </aside>

      {isAddOpen ? (
        <Modal
          onClose={() => setIsAddOpen(false)}
          title={t("groups.addParticipant")}>
          <form action={addAction} className="grid gap-5">
            <input name="mode" type="hidden" value={addMode} />
            <div className="flex items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#087f6f] text-white shadow-[0_10px_22px_rgba(8,127,111,0.18)]">
                <UserPlus className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xl font-extrabold text-[var(--splity-ink)]">{t("createGroupSetup.participantsTitle")}</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--splity-muted)]">
                  {t(addMode === "manual" ? "groupDetail.manualAddBody" : "groupDetail.manualInviteBody")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--splity-bg)] p-1">
              {(["manual", "invite"] as const).map((mode) => (
                <button
                  className={[
                    "h-10 rounded-lg text-sm font-bold transition-colors",
                    addMode === mode
                      ? "bg-white text-teal-700 shadow-sm"
                      : "text-[var(--splity-muted)] hover:text-[var(--splity-ink)]",
                  ].join(" ")}
                  key={mode}
                  onClick={() => setAddMode(mode)}
                  type="button"
                >
                  {t(mode === "manual" ? "groups.manual" : "groupDetail.inviteUser")}
                </button>
              ))}
            </div>

            {addMode === "manual" ? (
              <Input
                disabled={!canEdit}
                label={t("groups.name")}
                name="name"
                onChange={(event) => setManualName(event.target.value)}
                placeholder={t("createGroupSetup.participantPlaceholder")}
                required
                value={manualName}
              />
            ) : (
              <>
                <Input
                  autoCapitalize="none"
                  disabled={!canEdit}
                  label={t("settings.username")}
                  name="username"
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={t("createGroupSetup.usernamePlaceholder")}
                  required
                  value={username}
                />
                <input name="lookupId" type="hidden" value={lookup?.id ?? ""} />
                {lookup ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/65 p-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700">
                        {t("createGroupSetup.userFound")}
                      </p>
                      <p className="mt-1 truncate font-bold text-[var(--splity-ink)]">{lookup.name}</p>
                      <p className="truncate text-xs font-semibold text-[var(--splity-muted)]">@{lookup.username}</p>
                    </div>
                    <SubmitButton
                      disabled={!canEdit}
                      pendingLabel={t("groups.adding")}
                      value="add"
                    >
                      {t("createGroupSetup.inviteUser")}
                    </SubmitButton>
                  </div>
                ) : null}
              </>
            )}

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
              {addMode === "manual" ? (
                <SubmitButton
                  disabled={!canEdit || !manualName.trim()}
                  icon={<UserPlus className="h-4 w-4" />}
                  pendingLabel={t("groups.adding")}
                  value="add">
                  {t("groups.addParticipant")}
                </SubmitButton>
              ) : (
                <SubmitButton
                  disabled={!canEdit || !username.trim()}
                  icon={<Search className="h-4 w-4" />}
                  pendingLabel={t("groups.checking")}
                  value="lookup">
                  {t("createGroupSetup.searchAndInvite")}
                </SubmitButton>
              )}
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
  const [menuOpen, setMenuOpen] = useState(false);
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
  const isManual = !participant.invited_user_id;

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
    <article className="relative min-h-[88px] rounded-xl border border-[var(--splity-line)] bg-white px-5 py-4 transition hover:border-teal-200 hover:shadow-[0_8px_24px_rgba(12,21,56,0.05)]">
      <div className="grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="splity-display inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-700 text-base font-bold text-white">
            {initials(participant.name)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-bold text-[var(--splity-ink)]">
                {participant.name}
              </p>
              {isOrganizer ? (
                <span className="rounded-full border border-teal-100 bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-teal-700">
                  {t("groupDetail.organizer")}
                </span>
              ) : isManual ? (
                <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold text-violet-700">
                  {t("groups.manual")}
                </span>
              ) : null}
            </div>
            {participant.username ? (
              <p className="mt-1 truncate text-xs font-medium text-[var(--splity-muted)]">
                @{participant.username}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-3">
          {statusMeta ? (
            <span
              className={[
                "inline-flex h-7 items-center gap-1.5 rounded-full border border-teal-100 px-3 text-[11px] font-bold",
                statusMeta.pill,
              ].join(" ")}>
              {status === 2 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className={["h-1.5 w-1.5 rounded-full", statusMeta.dot].join(" ")} />}
              {t(statusMeta.labelKey)}
            </span>
          ) : null}
          {canEdit ? (
            <button
              aria-label={t("groupDetail.actions")}
              className="grid h-9 w-9 place-items-center rounded-full border border-[var(--splity-line)] bg-white text-[var(--splity-muted)] transition hover:bg-teal-50 hover:text-teal-700"
              onClick={() => setMenuOpen((open) => !open)}
              type="button">
              <MoreVertical className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {canEdit && menuOpen ? (
        <div className="absolute right-4 top-[60px] z-20 grid min-w-36 gap-1 rounded-xl border border-[var(--splity-line)] bg-white p-1.5 shadow-xl">
          {!isInvitedParticipant ? (
            <button
              aria-label={format(t("groupDetail.editParticipantLabel"), {
                name: participant.name,
              })}
              className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-[var(--splity-ink)] hover:bg-teal-50"
              onClick={() => {
                setMenuOpen(false);
                setOpenModal("edit");
              }}
              type="button">
              <Pencil className="h-3.5 w-3.5" />{t("common.edit")}
            </button>
          ) : null}
          <button
            aria-label={format(t("groupDetail.deleteParticipantTitle"), {
              name: participant.name,
            })}
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-[var(--splity-muted)] disabled:opacity-50 disabled:hover:bg-transparent"
            disabled={isOrganizer}
            onClick={() => {
              setMenuOpen(false);
              setOpenModal("delete");
            }}
            type="button">
            <Trash2 className="h-3.5 w-3.5" />{t("common.remove")}
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
            <input name="name" type="hidden" value={participant.name} />
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
