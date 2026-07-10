"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Star,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { T } from "@/components/i18n/t";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { Spinner } from "@/components/ui/spinner";
import { calculateBillShares } from "@/lib/calculations/bill-calculator";
import { SPLIT_MODE, type FeeType, type SplitMode } from "@/lib/calculations/types";
import { useTranslation, type MessageKey } from "@/lib/i18n";
import type { BillDetail } from "@/lib/calculations/bill-read-projection";
import type { Participant } from "@/lib/services/participants";
import { BillForm } from "../[groupId]/bills/bill-form";
import type { BillActionState } from "../[groupId]/bills/actions";
import {
  createSetupGroupPhaseAction,
  finalizeGroupSetupPhaseAction,
  saveSetupBillsPhaseAction,
  saveSetupParticipantsPhaseAction,
  searchSetupInviteUserAction,
  type InviteLookupState,
} from "./actions";

type SetupStep = "name" | "participants" | "bills" | "summary";
type ParticipantMode = "manual" | "invite";
type DraftParticipant = {
  id: string;
  name: string;
  type: ParticipantMode;
  username?: string | null;
};
type DraftOwnerParticipant = {
  id: string;
  name: string;
  username: string | null;
};
type DraftBill = {
  currencyCode: string;
  fees: { feeType: FeeType; name: string; value: string }[];
  id: string;
  items: { amount: string; description: string; id?: string; responsibleParticipantIds: string[] }[];
  participantSplits: { participantId: string; weight: string }[];
  primaryPayerParticipantId: string;
  splitMode: SplitMode;
  storeName: string;
  transactionDateUtc: string;
};

const steps: SetupStep[] = ["name", "participants", "bills", "summary"];
const primaryButtonClass =
  "!rounded-xl !border-0 !bg-[#087f6f] !font-bold !text-white !shadow-[0_10px_22px_rgba(8,127,111,0.18)] hover:!bg-[#066c60] focus-visible:!outline-[#087f6f]";
const secondaryButtonClass = "!rounded-xl !border-[var(--splity-line)] !font-bold";
const setupIconClass =
  "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#087f6f] text-white shadow-[0_10px_22px_rgba(8,127,111,0.18)]";
const exampleNameKeys = [
  "createGroupSetup.exampleTrip",
  "createGroupSetup.exampleRent",
  "createGroupSetup.exampleDinner",
  "createGroupSetup.exampleProject",
  "createGroupSetup.exampleRoommates",
] satisfies MessageKey[];

export function CreateGroupSetupScreen({ ownerParticipant }: { ownerParticipant: DraftOwnerParticipant }) {
  const [step, setStep] = useState<SetupStep>("name");
  const [groupName, setGroupName] = useState("");
  const [participants, setParticipants] = useState<DraftParticipant[]>([]);
  const [bills, setBills] = useState<DraftBill[]>([]);
  const stepIndex = steps.indexOf(step);
  const { t } = useTranslation();
  const previewName = groupName.trim() || t("createGroupSetup.untitledGroup");

  return (
    <div
      className={[
        "mx-auto grid min-h-[calc(100vh-120px)] w-full grid-rows-[auto_1fr_auto] gap-5",
        "max-w-5xl",
      ].join(" ")}
    >
      <SetupHeader stepIndex={stepIndex} />
      <main className="grid content-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
        <div>
          {step === "name" ? (
            <NameStep groupName={groupName} onContinue={() => setStep("participants")} setGroupName={setGroupName} />
          ) : null}
          {step === "participants" ? (
            <ParticipantStep participants={participants} setParticipants={setParticipants} />
          ) : null}
          {step === "bills" ? (
            <BillsStep
              bills={bills}
              ownerParticipant={ownerParticipant}
              participants={participants}
              setBills={setBills}
            />
          ) : null}
          {step === "summary" ? (
            <SummaryStep bills={bills} groupName={groupName} participantCount={participants.length + 1} />
          ) : null}
        </div>
        <aside className="grid gap-4 lg:sticky lg:top-24">
          <GroupPreviewCard activeStep={step} bills={bills} name={previewName} participantCount={participants.length + 1} />
          <SetupChecklist activeStep={step} />
        </aside>
      </main>
      {step !== "name" ? (
        <SetupBottomBar
          backStep={() => setStep(steps[Math.max(stepIndex - 1, 0)])}
          primary={
            step === "participants" ? (
              <Button className={primaryButtonClass} onClick={() => setStep("bills")}>
                {t("createGroupSetup.continue")}
              </Button>
            ) : step === "bills" ? (
              <Button className={primaryButtonClass} onClick={() => setStep("summary")}>
                {t("createGroupSetup.continue")}
              </Button>
            ) : (
              <CompleteButton bills={bills} groupName={groupName} ownerParticipant={ownerParticipant} participants={participants} />
            )
          }
          secondary={
            step === "participants" ? (
              <Button className={secondaryButtonClass} onClick={() => setStep("bills")} variant="secondary">
                {t("createGroupSetup.skipForNow")}
              </Button>
            ) : step === "bills" ? (
              <Button className={secondaryButtonClass} onClick={() => setStep("summary")} variant="secondary">
                {t("createGroupSetup.skipBills")}
              </Button>
            ) : null
          }
        />
      ) : null}
    </div>
  );
}

function SetupHeader({ stepIndex }: { stepIndex: number }) {
  const progress = ((stepIndex + 1) / steps.length) * 100;

  return (
    <header className="rounded-2xl border border-[var(--splity-line)] bg-white p-4 shadow-[0_2px_8px_rgba(12,21,56,0.06)] sm:rounded-3xl">
      <div className="flex items-center gap-3">
        <Link
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--splity-line)] text-[var(--splity-ink)] transition hover:bg-[var(--splity-bg)]"
          href="/groups"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">
            <T k="common.backToGroups" />
          </span>
        </Link>
        <div className="min-w-0">
          <h1 className="splity-display truncate text-2xl font-bold tracking-tight text-[var(--splity-ink)]">
            <T k="createGroupSetup.title" />
          </h1>
          <p className="text-sm font-semibold text-[var(--splity-muted)]">
            <T k="createGroupSetup.stepCount" values={{ step: stepIndex + 1, total: steps.length }} />
          </p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--splity-bg)]">
        <div className="h-full rounded-full bg-[#087f6f] transition-all" style={{ width: `${progress}%` }} />
      </div>
    </header>
  );
}

function StepIntro({
  children,
  description,
  icon,
  scrollContained = false,
  title,
}: {
  children: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  scrollContained?: boolean;
  title: ReactNode;
}) {
  return (
    <section className={scrollContained ? "grid max-h-[calc(100vh-270px)] min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4" : "grid gap-4"}>
      <div className="flex items-start gap-3">
        <span className={setupIconClass}>{icon}</span>
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[var(--splity-ink)]">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--splity-muted)]">{description}</p>
        </div>
      </div>
      <div className="min-h-0 rounded-2xl border border-[var(--splity-line)] bg-white p-4 shadow-[0_2px_8px_rgba(12,21,56,0.06)] sm:rounded-3xl sm:p-6">
        {children}
      </div>
    </section>
  );
}

function NameStep({
  groupName,
  onContinue,
  setGroupName,
}: {
  groupName: string;
  onContinue: () => void;
  setGroupName: (name: string) => void;
}) {
  const [error, setError] = useState("");
  const { t } = useTranslation();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupName.trim()) {
      setError(t("groupDetail.error.groupNameLength"));
      return;
    }
    setError("");
    onContinue();
  }

  return (
    <section>
      <div className="rounded-2xl border border-[var(--splity-line)] bg-white p-5 shadow-[0_2px_8px_rgba(12,21,56,0.06)] sm:rounded-3xl sm:p-6">
        <div className="flex items-start gap-3">
          <span className={setupIconClass}>
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--splity-ink)]">
              <T k="createGroupSetup.nameTitle" />
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--splity-muted)]">
              <T k="createGroupSetup.nameBody" />
            </p>
          </div>
        </div>

        <form className="mt-6 grid gap-5" onSubmit={submit}>
          <Input
            autoFocus
            label={t("dashboard.groupName")}
            maxLength={200}
            name="name"
            onChange={(event) => setGroupName(event.target.value)}
            placeholder={t("dashboard.groupNamePlaceholder")}
            required
            value={groupName}
          />
          <ExampleNameChips onPick={setGroupName} />
          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
          <Button className={primaryButtonClass} type="submit">
            {t("createGroupSetup.continue")}
          </Button>
        </form>
      </div>
    </section>
  );
}

function ExampleNameChips({ onPick }: { onPick: (value: string) => void }) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-2">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--splity-muted)]">
        {t("createGroupSetup.quickExamples")}
      </p>
      <div className="flex flex-wrap gap-2">
        {exampleNameKeys.map((key) => (
          <button
            className="rounded-full border border-[var(--splity-line)] bg-[var(--splity-bg)]/65 px-3 py-1.5 text-xs font-bold text-[var(--splity-ink)] transition hover:border-[#087f6f] hover:bg-emerald-50 hover:text-[#087f6f]"
            key={key}
            onClick={() => onPick(t(key))}
            type="button"
          >
            {t(key)}
          </button>
        ))}
      </div>
    </div>
  );
}

function GroupPreviewCard({
  activeStep,
  bills,
  name,
  participantCount,
}: {
  activeStep: SetupStep;
  bills: DraftBill[];
  name: string;
  participantCount: number;
}) {
  const total = bills.reduce((sum, bill) => sum + Number(draftBillTotal(bill)), 0);
  const nextStepKey = (
    activeStep === "name"
      ? "createGroupSetup.addParticipants"
      : activeStep === "participants"
        ? "createGroupSetup.checkBills"
        : "createGroupSetup.checkComplete"
  ) satisfies MessageKey;

  return (
    <section className="rounded-2xl border border-[var(--splity-line)] bg-white p-5 shadow-[0_2px_8px_rgba(12,21,56,0.06)] sm:rounded-3xl">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-extrabold text-[var(--splity-ink)]">
          <T k="createGroupSetup.groupPreview" />
        </h3>
        <Badge tone="green">
          <T k="createGroupSetup.draft" />
        </Badge>
      </div>
      <div className="mt-5 rounded-2xl border border-[var(--splity-line)] bg-[#fffefa] p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--splity-muted)]">
          <T k="dashboard.groupName" />
        </p>
        <p className="mt-2 truncate text-2xl font-extrabold text-[var(--splity-ink)]">{name}</p>
      </div>
      <div className="mt-4 grid gap-2">
        <PreviewRow
          label={<T k="groups.participants" />}
          value={
            participantCount ? (
              <T k="groupDetail.participantCount" values={{ count: participantCount }} />
            ) : (
              <T k="createGroupSetup.notAddedYet" />
            )
          }
        />
        <PreviewRow
          label={<T k="groups.bills" />}
          value={bills.length ? `${bills.length} · RM ${total.toFixed(2)}` : <T k="createGroupSetup.noBillsYet" />}
        />
        <PreviewRow label={<T k="createGroupSetup.nextStep" />} value={<T k={nextStepKey} />} />
      </div>
    </section>
  );
}

function PreviewRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--splity-bg)]/55 px-3 py-2">
      <span className="text-sm font-semibold text-[var(--splity-muted)]">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-bold text-[var(--splity-ink)]">{value}</span>
    </div>
  );
}

function SetupChecklist({ activeStep }: { activeStep: SetupStep }) {
  const activeIndex = steps.indexOf(activeStep);
  const checklist = [
    ["name", "createGroupSetup.checkName"],
    ["participants", "createGroupSetup.checkParticipants"],
    ["bills", "createGroupSetup.checkBills"],
    ["summary", "createGroupSetup.checkComplete"],
  ] satisfies [SetupStep, MessageKey][];

  return (
    <section className="rounded-2xl border border-[var(--splity-line)] bg-white p-5 shadow-[0_2px_8px_rgba(12,21,56,0.06)] sm:rounded-3xl">
      <h3 className="font-extrabold text-[var(--splity-ink)]">
        <T k="createGroupSetup.setupChecklist" />
      </h3>
      <div className="mt-4 grid gap-3">
        {checklist.map(([step, key], index) => {
          const active = step === activeStep;
          const completed = index < activeIndex;
          return (
            <div className="flex items-center gap-3" key={key}>
              <span
                className={[
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                  active || completed ? "bg-[#087f6f] text-white" : "bg-[var(--splity-bg)] text-[var(--splity-muted)]",
                ].join(" ")}
              >
                {completed ? (
                  <Check className="h-3.5 w-3.5" />
                ) : active ? (
                  <Star className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
                ) : (
                  index + 1
                )}
              </span>
              <span className={active ? "text-sm font-extrabold text-[#087f6f]" : "text-sm font-bold text-[var(--splity-muted)]"}>
                <T k={key} />
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ParticipantStep({
  participants,
  setParticipants,
}: {
  participants: DraftParticipant[];
  setParticipants: (participants: DraftParticipant[]) => void;
}) {
  const [mode, setMode] = useState<ParticipantMode>("manual");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [manualError, setManualError] = useState("");
  const [hasInviteSearched, setHasInviteSearched] = useState(false);
  const [inviteState, inviteAction] = useActionState<InviteLookupState, FormData>(
    searchSetupInviteUserAction,
    { error: null, lookup: null }
  );
  const { t } = useTranslation();

  function participantExists(input: { name?: string; username?: string | null }) {
    const cleanName = input.name?.trim().toLowerCase();
    const cleanUsername = input.username?.trim().replace(/^@+/, "").toLowerCase();
    return participants.some((participant) => {
      return (
        (cleanUsername && participant.username?.toLowerCase() === cleanUsername) ||
        (cleanName && participant.name.trim().toLowerCase() === cleanName)
      );
    });
  }

  function addParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = name.trim();
    if (!next) {
      setManualError(t("groupDetail.error.participantNameLength"));
      return;
    }
    if (participantExists({ name: next })) {
      setManualError(t("groupDetail.error.participantDuplicate"));
      return;
    }
    setParticipants([...participants, { id: crypto.randomUUID(), name: next, type: "manual", username: null }]);
    setManualError("");
    setName("");
  }

  function addInvitedParticipant() {
    if (!inviteState.lookup) return;
    if (participantExists({ name: inviteState.lookup.name, username: inviteState.lookup.username })) {
      toast.error(t("groupDetail.error.participantDuplicate"));
      return;
    }
    setParticipants([
      ...participants,
      {
        id: inviteState.lookup.id,
        name: inviteState.lookup.name,
        type: "invite",
        username: inviteState.lookup.username,
      },
    ]);
    setUsername("");
    toast.success(t("groupDetail.action.participantAdded"));
  }

  return (
    <StepIntro
      description={<T k="createGroupSetup.participantsBody" />}
      icon={<UserPlus className="h-5 w-5" />}
      scrollContained
      title={<T k="createGroupSetup.participantsTitle" />}
    >
      <div className="flex h-full min-h-0 flex-col">
      <ParticipantModeToggle mode={mode} setMode={setMode} />
      {mode === "manual" ? (
        <form className="mt-4 grid gap-3" onSubmit={addParticipant}>
          <Input
            label={t("groups.name")}
            maxLength={150}
            name="name"
            onChange={(event) => setName(event.target.value)}
            placeholder={t("createGroupSetup.participantPlaceholder")}
            value={name}
          />
          {manualError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {manualError}
            </p>
          ) : null}
          <Button className={primaryButtonClass} type="submit">
            <UserPlus className="h-4 w-4" />
            {t("groups.addParticipant")}
          </Button>
        </form>
      ) : (
        <form action={inviteAction} className="mt-4 grid gap-3" onSubmit={() => setHasInviteSearched(true)}>
          <Input
            autoCapitalize="none"
            label={t("settings.username")}
            name="username"
            onChange={(event) => setUsername(event.target.value)}
            placeholder={t("createGroupSetup.usernamePlaceholder")}
            value={username}
          />
          <PendingActionButton className={primaryButtonClass} pendingLabel={t("groups.checking")} type="submit">
            <Search className="h-4 w-4" />
            {t("createGroupSetup.searchAndInvite")}
          </PendingActionButton>
          <InviteSearchResult
            error={inviteState.error}
            lookup={inviteState.lookup}
            onAdd={addInvitedParticipant}
            onManual={() => setMode("manual")}
            showEmpty={hasInviteSearched}
          />
        </form>
      )}
      <ParticipantTray participants={participants} setParticipants={setParticipants} />
      </div>
    </StepIntro>
  );
}

function ParticipantModeToggle({
  mode,
  setMode,
}: {
  mode: ParticipantMode;
  setMode: (mode: ParticipantMode) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 rounded-xl border border-[var(--splity-line)] bg-[var(--splity-bg)] p-1">
      {(["manual", "invite"] satisfies ParticipantMode[]).map((item) => (
        <button
          className={[
            "h-9 rounded-lg text-sm font-bold transition",
            mode === item
              ? "bg-[#087f6f] text-white shadow-sm"
              : "text-[var(--splity-muted)] hover:bg-white hover:text-[var(--splity-ink)]",
          ].join(" ")}
          key={item}
          onClick={() => setMode(item)}
          type="button"
        >
          {t(item === "manual" ? "groupDetail.addModeManual" : "groupDetail.addModeInvite")}
        </button>
      ))}
    </div>
  );
}

function InviteSearchResult({
  error,
  lookup,
  onAdd,
  onManual,
  showEmpty,
}: {
  error: string | null;
  lookup: InviteLookupState["lookup"];
  onAdd: () => void;
  onManual: () => void;
  showEmpty: boolean;
}) {
  const { t } = useTranslation();

  if (error) {
    return <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>;
  }

  if (lookup) {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#087f6f]">
          {t("createGroupSetup.userFound")}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-bold text-[var(--splity-ink)]">{lookup.name}</p>
            <p className="truncate text-xs font-semibold text-[var(--splity-muted)]">@{lookup.username}</p>
          </div>
          <Button className={primaryButtonClass} onClick={onAdd}>
            {t("createGroupSetup.inviteUser")}
          </Button>
        </div>
      </div>
    );
  }

  if (!showEmpty) return null;

  return (
    <div className="rounded-xl border border-dashed border-[var(--splity-line-strong)] bg-[var(--splity-bg)]/45 p-3">
      <p className="font-bold text-[var(--splity-ink)]">{t("createGroupSetup.noUserFound")}</p>
      <p className="mt-1 text-sm text-[var(--splity-muted)]">{t("createGroupSetup.noUserFoundBody")}</p>
      <button className="mt-2 text-sm font-bold text-[#087f6f]" onClick={onManual} type="button">
        {t("createGroupSetup.switchToManual")}
      </button>
    </div>
  );
}

function ParticipantTray({
  participants,
  setParticipants,
}: {
  participants: DraftParticipant[];
  setParticipants: (participants: DraftParticipant[]) => void;
}) {
  return (
    <section className="mt-5 flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--splity-line)] bg-[var(--splity-bg)]/35 p-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="text-sm font-extrabold text-[var(--splity-ink)]">
          <T k="createGroupSetup.participantsAdded" />
        </h3>
        <span className="text-xs font-bold text-[var(--splity-muted)]">
          <T k="groupDetail.participantCount" values={{ count: participants.length }} />
        </span>
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        {participants.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {participants.map((participant) => (
              <ParticipantItem
                key={participant.id}
                onRemove={() => setParticipants(participants.filter((item) => item.id !== participant.id))}
                participant={participant}
              />
            ))}
          </div>
        ) : (
          <EmptySetupState
            body={<T k="createGroupSetup.noParticipantsTrayBody" />}
            title={<T k="createGroupSetup.noParticipantsTrayTitle" />}
          />
        )}
      </div>
    </section>
  );
}

function ParticipantItem({
  onRemove,
  participant,
}: {
  onRemove: () => void;
  participant: DraftParticipant;
}) {
  const { t } = useTranslation();
  const labelKey = participant.type === "invite" ? "createGroupSetup.invitedBadge" : "groups.manual";

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[var(--splity-line)] bg-white px-3 py-2">
      <span className="splity-display inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#087f6f] text-xs font-extrabold text-white">
        {initials(participant.name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[var(--splity-ink)]">{participant.name}</p>
        <p className="truncate text-xs font-semibold text-[var(--splity-muted)]">
          {participant.username ? `@${participant.username}` : t(labelKey).toUpperCase()}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Badge tone={participant.type === "invite" ? "green" : "neutral"}>{t(labelKey)}</Badge>
        <button
          aria-label={t("common.remove")}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--splity-muted)] transition hover:bg-red-50 hover:text-red-700 focus-visible:bg-red-50 focus-visible:text-red-700"
          onClick={onRemove}
          type="button"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
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

function BillsStep({
  bills,
  ownerParticipant,
  participants,
  setBills,
}: {
  bills: DraftBill[];
  ownerParticipant: DraftOwnerParticipant;
  participants: DraftParticipant[];
  setBills: (bills: DraftBill[]) => void;
}) {
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const { t } = useTranslation();
  const draftParticipants = useMemo(() => toBillFormParticipants(ownerParticipant, participants), [ownerParticipant, participants]);
  const editingBill = bills.find((bill) => bill.id === editingBillId) ?? null;
  const total = bills.reduce((sum, bill) => sum + Number(draftBillTotal(bill)), 0);

  async function saveDraftBill(_prevState: BillActionState, formData: FormData): Promise<BillActionState> {
    try {
      const bill = draftBillFromFormData(formData, editingBill?.id ?? crypto.randomUUID());
      setBills(editingBill ? bills.map((item) => (item.id === editingBill.id ? bill : item)) : [...bills, bill]);
      setEditingBillId(null);
      return { error: null };
    } catch {
      return { error: t("bills.error.invalidPayload") };
    }
  }

  return (
    <StepIntro
      description={<T k="createGroupSetup.billsBody" />}
      icon={<ReceiptText className="h-5 w-5" />}
      scrollContained
      title={<T k="createGroupSetup.billsTitle" />}
    >
      <section className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--splity-line)] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-extrabold text-[var(--splity-ink)]">{t("createGroupSetup.billSectionTitle")}</h3>
          <Button className={primaryButtonClass} onClick={() => setEditingBillId("new")}>
            <Plus className="h-4 w-4" />
            {t("createGroupSetup.addBillDraft")}
          </Button>
        </div>

        {bills.length ? (
          <>
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-2">
                {bills.map((bill) => (
                  <DraftBillRow
                    bill={bill}
                    key={bill.id}
                    onEdit={() => setEditingBillId(bill.id)}
                    onRemove={() => setBills(bills.filter((item) => item.id !== bill.id))}
                    participants={draftParticipants}
                  />
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--splity-line)] pt-3">
              <span className="text-sm font-bold text-[var(--splity-muted)]">{t("createGroupSetup.totalBillAmount")}</span>
              <span className="font-mono text-lg font-extrabold text-[var(--splity-navy)]">RM {total.toFixed(2)}</span>
            </div>
          </>
        ) : (
          <div className="mt-4">
            <EmptySetupState
              body={<T k="createGroupSetup.noDraftBillsBody" />}
              title={<T k="createGroupSetup.noDraftBillsTitle" />}
            />
          </div>
        )}
      </section>

      {editingBillId ? (
        <Dialog onOpenChange={(open) => !open && setEditingBillId(null)} open>
          <DialogContent className="max-w-7xl">
            <DialogHeader className="mb-5 border-b border-[var(--splity-line)] pb-4">
              <DialogTitle>{editingBill ? t("bills.editBill") : t("groups.newBill")}</DialogTitle>
              <p className="text-sm font-semibold text-[var(--splity-muted)]">{t("bills.editorBody")}</p>
            </DialogHeader>
            <BillForm
              action={saveDraftBill}
              canEdit
              initialBill={editingBill ? draftBillToBillDetail(editingBill) : undefined}
              onCancel={() => setEditingBillId(null)}
              participants={draftParticipants}
              routeSuccess={false}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </StepIntro>
  );
}

function DraftBillRow({
  bill,
  onEdit,
  onRemove,
  participants,
}: {
  bill: DraftBill;
  onEdit: () => void;
  onRemove: () => void;
  participants: Participant[];
}) {
  const { t } = useTranslation();
  const payer = participants.find((participant) => participant.id === bill.primaryPayerParticipantId);

  return (
    <div className="grid gap-3 rounded-xl border border-[var(--splity-line)] bg-[#fffefa] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="truncate font-bold text-[var(--splity-ink)]">{bill.storeName}</p>
        <p className="mt-1 truncate text-xs font-semibold text-[var(--splity-muted)]">
          {t("bills.paidByShort")} {payer?.name ?? t("bills.unknown")} ·{" "}
          {bill.splitMode === SPLIT_MODE.weighted ? t("groupDetail.splitUneven") : t("groupDetail.splitEqual")} ·{" "}
          {t("bills.itemCount").replace("{count}", String(bill.items.length))} · {formatBillDate(bill.transactionDateUtc)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span className="font-mono text-sm font-extrabold text-[var(--splity-navy)]">RM {draftBillTotal(bill)}</span>
        <button
          aria-label={t("common.edit")}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--splity-line)] bg-white text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)]"
          onClick={onEdit}
          type="button"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          aria-label={t("common.remove")}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--splity-line)] bg-white text-[var(--splity-muted)] transition hover:bg-red-50 hover:text-red-700"
          onClick={onRemove}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function toBillFormParticipants(ownerParticipant: DraftOwnerParticipant, participants: DraftParticipant[]): Participant[] {
  const createdAtUtc = new Date(0).toISOString();
  return [
    {
      id: ownerParticipant.id,
      group_id: "draft",
      name: ownerParticipant.name,
      username: ownerParticipant.username,
      invited_user_id: ownerParticipant.id,
      invitation_status: 2,
      created_at_utc: createdAtUtc,
    },
    ...participants.map((participant) => ({
      id: participant.id,
      group_id: "draft",
      name: participant.name,
      username: participant.username ?? null,
      invited_user_id: participant.type === "invite" ? participant.id : null,
      invitation_status: participant.type === "invite" ? 1 : 0,
      created_at_utc: createdAtUtc,
    })),
  ];
}

function draftBillFromFormData(formData: FormData, id: string): DraftBill {
  const raw = String(formData.get("payload") ?? "");
  const payload = JSON.parse(raw) as Omit<DraftBill, "id">;
  calculateBillShares({
    participantSplits: payload.participantSplits,
    items: payload.items,
    fees: payload.fees,
    primaryPayerParticipantId: payload.primaryPayerParticipantId,
  });

  return {
    ...payload,
    currencyCode: payload.currencyCode ?? "MYR",
    id,
  };
}

function draftBillResult(bill: DraftBill) {
  return calculateBillShares({
    participantSplits: bill.participantSplits,
    items: bill.items,
    fees: bill.fees,
    primaryPayerParticipantId: bill.primaryPayerParticipantId,
  });
}

function draftBillTotal(bill: DraftBill) {
  return draftBillResult(bill).grandTotalAmount;
}

function draftBillToBillDetail(bill: DraftBill): BillDetail {
  const result = draftBillResult(bill);

  return {
    id: bill.id,
    groupId: "draft",
    storeName: bill.storeName,
    referenceImageDataUrl: null,
    transactionDateUtc: bill.transactionDateUtc,
    currencyCode: bill.currencyCode,
    splitMode: bill.splitMode,
    primaryPayerParticipantId: bill.primaryPayerParticipantId,
    subtotalAmount: result.subtotalAmount,
    totalFeeAmount: result.totalFeeAmount,
    grandTotalAmount: result.grandTotalAmount,
    appliedFees: result.appliedFees,
    items: bill.items.map((item, index) => ({
      id: item.id ?? `item-${index}`,
      description: item.description,
      amount: item.amount,
      responsibleParticipantIds: item.responsibleParticipantIds,
    })),
    fees: bill.fees.map((fee, index) => ({
      id: `fee-${index}`,
      name: fee.name,
      feeType: fee.feeType,
      value: fee.value,
    })),
    shares: result.shares,
    createdAtUtc: new Date(0).toISOString(),
    updatedAtUtc: new Date(0).toISOString(),
  };
}

function formatBillDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function SummaryStep({
  bills,
  groupName,
  participantCount,
}: {
  bills: DraftBill[];
  groupName: string;
  participantCount: number;
}) {
  const total = bills.reduce((sum, bill) => sum + Number(draftBillTotal(bill)), 0);

  return (
    <StepIntro
      description={<T k="createGroupSetup.summaryBody" />}
      icon={<Check className="h-5 w-5" />}
      title={<T k="createGroupSetup.summaryTitle" />}
    >
      <div className="grid gap-3">
        <SummaryRow label={<T k="dashboard.groupName" />} value={groupName} />
        <SummaryRow
          label={<T k="groups.participants" />}
          value={
            participantCount ? (
              <T k="groupDetail.participantCount" values={{ count: participantCount }} />
            ) : (
              <T k="createGroupSetup.notAddedYet" />
            )
          }
        />
        <SummaryRow
          label={<T k="groups.bills" />}
          value={bills.length ? <T k="groupDetail.billCount" values={{ count: bills.length }} /> : <T k="createGroupSetup.noBillsYet" />}
        />
        <SummaryRow
          label={<T k="createGroupSetup.totalBillAmount" />}
          value={bills.length ? `RM ${total.toFixed(2)}` : <T k="createGroupSetup.noBillsYet" />}
        />
        <SummaryRow label={<T k="groups.status" />} value={<T k="groups.status.unresolved" />} />
      </div>
    </StepIntro>
  );
}

function SummaryRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--splity-line)] bg-[#fffefa] px-4 py-3">
      <span className="text-sm font-bold text-[var(--splity-muted)]">{label}</span>
      <span className="min-w-0 text-right font-extrabold text-[var(--splity-ink)]">{value}</span>
    </div>
  );
}

function EmptySetupState({
  body,
  title,
}: {
  body: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--splity-line-strong)] bg-[var(--splity-bg)]/45 p-6 text-center">
      <h3 className="text-lg font-extrabold text-[var(--splity-ink)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--splity-muted)]">{body}</p>
    </div>
  );
}

function SetupBottomBar({
  backStep,
  primary,
  secondary,
}: {
  backStep: () => void;
  primary: ReactNode;
  secondary: ReactNode;
}) {
  return (
    <footer className="sticky bottom-4 rounded-2xl border border-[var(--splity-line)] bg-white/95 p-3 shadow-[0_18px_45px_rgba(12,21,56,0.12)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button className="rounded-xl font-bold" onClick={backStep} variant="ghost">
          <T k="common.back" />
        </Button>
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          {secondary}
          {primary}
        </div>
      </div>
    </footer>
  );
}

function CompleteButton({
  bills,
  groupName,
  ownerParticipant,
  participants,
}: {
  bills: DraftBill[];
  groupName: string;
  ownerParticipant: DraftOwnerParticipant;
  participants: DraftParticipant[];
}) {
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  async function completeSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingStep(0);

    try {
      const groupResult = await createSetupGroupPhaseAction({
        name: groupName,
        ownerParticipantId: ownerParticipant.id,
      });
      if (!groupResult.data) throw new Error(groupResult.error ?? t("createGroupSetup.completeFailed"));

      const { groupId } = groupResult.data;
      let participantIdMap = groupResult.data.participantIdMap;

      setLoadingStep(1);
      const participantsResult = await saveSetupParticipantsPhaseAction({
        groupId,
        participants: participants.map(({ id, name, username }) => ({
          id,
          name,
          username: username ?? null,
        })),
      });
      if (!participantsResult.data) {
        throw new Error(participantsResult.error ?? t("createGroupSetup.completeFailed"));
      }
      participantIdMap = { ...participantIdMap, ...participantsResult.data };

      setLoadingStep(2);
      const billsResult = await saveSetupBillsPhaseAction({
        bills,
        groupId,
        participantIdMap,
      });
      if (!billsResult.data) throw new Error(billsResult.error ?? t("createGroupSetup.completeFailed"));

      setLoadingStep(3);
      const finalizeResult = await finalizeGroupSetupPhaseAction(groupId);
      if (!finalizeResult.data) {
        throw new Error(finalizeResult.error ?? t("createGroupSetup.completeFailed"));
      }

      toast.success(finalizeResult.data.success);
      router.push(`/groups/${groupId}`);
    } catch (error) {
      setLoadingStep(null);
      toast.error(error instanceof Error ? error.message : t("createGroupSetup.completeFailed"));
    }
  }

  return (
    <>
      <form onSubmit={completeSetup}>
        <Button className={primaryButtonClass} disabled={loadingStep !== null} type="submit">
          <Check className="h-4 w-4" />
          {t("createGroupSetup.completeSetup")}
        </Button>
      </form>
      {loadingStep !== null ? (
        <MultiStepCompletionLoader
          index={loadingStep}
          steps={[
            t("createGroupSetup.loaderCreating"),
            t("createGroupSetup.loaderParticipants"),
            t("createGroupSetup.loaderBills"),
            t("createGroupSetup.loaderFinalizing"),
          ]}
        />
      ) : null}
    </>
  );
}

function MultiStepCompletionLoader({
  index,
  steps,
}: {
  index: number;
  steps: string[];
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--splity-bg)]/90 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-[var(--splity-line)] bg-white p-6 shadow-[0_24px_70px_rgba(12,21,56,0.18)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#087f6f] text-white shadow-[0_10px_22px_rgba(8,127,111,0.18)]">
            <Spinner />
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--splity-gold-strong)]">
              <T k="createGroupSetup.loaderTitle" />
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-[var(--splity-ink)]">
              {steps[Math.min(index, steps.length - 1)]}
            </h2>
          </div>
        </div>
        <div className="mt-6 grid gap-3">
          {steps.map((step, stepIndex) => (
            <div className="flex items-center gap-3" key={step}>
              <span
                className={[
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold",
                  stepIndex < index
                    ? "bg-[#087f6f] text-white"
                    : stepIndex === index
                      ? "bg-[#fff4d8] text-[var(--splity-gold-strong)]"
                      : "bg-[var(--splity-bg)] text-[var(--splity-muted)]",
                ].join(" ")}
              >
                {stepIndex < index ? <Check className="h-3.5 w-3.5" /> : stepIndex + 1}
              </span>
              <span className="text-sm font-bold text-[var(--splity-ink)]">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
