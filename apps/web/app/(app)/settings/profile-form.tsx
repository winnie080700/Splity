"use client";

import { Check, Pencil, UserRound } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "@/lib/i18n";
import { updateProfileAction, type SettingsActionState } from "./actions";

type ProfileFormProps = {
  name: string;
  username: string;
};

const initialState: SettingsActionState = { error: null, success: null };
const DISPLAY_NAME_MAX_LENGTH = 150;
const USERNAME_MAX_LENGTH = 30;

function FieldRow({
  children,
  hint,
  label,
}: {
  children: ReactNode;
  hint: string;
  label: string;
}) {
  return (
    <div className="grid min-h-[76px] gap-3 border-b border-[var(--splity-line)] px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(180px,0.22fr)_1fr] sm:items-center sm:px-7">
      <div>
        <p className="text-sm font-extrabold text-[var(--splity-ink)]">
          {label}
        </p>
        <p className="mt-1 text-xs text-[var(--splity-muted)]">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function ProfileEditButton({
  editing,
  formRef,
  onCancel,
  setEditing,
}: {
  editing: boolean;
  formRef: RefObject<HTMLFormElement | null>;
  onCancel: () => void;
  setEditing: (value: boolean) => void;
}) {
  const { pending } = useFormStatus();
  const { t } = useTranslation();

  if (!editing) {
    return (
      <button
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--splity-line)] bg-white px-4 text-sm font-bold text-[#087f6f] transition hover:border-[#087f6f] hover:bg-emerald-50"
        onClick={() => setEditing(true)}
        type="button"
      >
        <Pencil className="h-4 w-4" />
        {t("common.edit")}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 sm:justify-end">
      <button
        className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-bold text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)] disabled:opacity-60"
        disabled={pending}
        onClick={onCancel}
        type="button"
      >
        {t("common.cancel")}
      </button>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#087f6f] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(8,127,111,0.20)] transition hover:bg-[#066c60] disabled:opacity-60"
        disabled={pending}
        onClick={() => formRef.current?.requestSubmit()}
        type="button"
      >
        {pending ? <Spinner /> : <Check className="h-4 w-4" />}
        {pending ? t("common.saving") : t("common.save")}
      </button>
    </div>
  );
}

function inputClass(editing: boolean) {
  return [
    "min-h-9 w-full rounded-lg text-sm font-extrabold text-[var(--splity-ink)] outline-none transition placeholder:text-[var(--splity-muted)] read-only:pointer-events-none read-only:cursor-default focus:border-[#087f6f] focus:bg-white focus:ring-2 focus:ring-[rgba(8,127,111,0.12)]",
    editing
      ? "border border-[#087f6f] bg-white pl-3 pr-16 ring-2 ring-[rgba(8,127,111,0.12)]"
      : "border border-transparent bg-transparent pl-0 pr-16",
  ].join(" ");
}

function CharacterCounter({ maxLength, value }: { maxLength: number; value: string }) {
  return (
    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--splity-muted)]">
      {value.length}/{maxLength}
    </span>
  );
}

export function ProfileForm({ name, username }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);
  const [editing, setEditing] = useState(false);
  const cleanUsername = username.replace(/^@+/, "");
  const [savedName, setSavedName] = useState(name);
  const [savedUsername, setSavedUsername] = useState(cleanUsername);
  const [nameValue, setNameValue] = useState(name);
  const [usernameValue, setUsernameValue] = useState(cleanUsername);
  const formRef = useRef<HTMLFormElement | null>(null);
  const latestNameRef = useRef(name);
  const latestUsernameRef = useRef(cleanUsername);
  const { t } = useTranslation();

  function cancelEdit() {
    latestNameRef.current = savedName;
    latestUsernameRef.current = savedUsername;
    setNameValue(savedName);
    setUsernameValue(savedUsername);
    setEditing(false);
  }

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      setSavedName(latestNameRef.current);
      setSavedUsername(latestUsernameRef.current);
      setEditing(false);
    }
    if (state.error) toast.error(state.error);
  }, [state.error, state.success]);

  return (
    <form action={formAction} ref={formRef}>
      <section className="overflow-hidden rounded-2xl border border-[var(--splity-line)] bg-white shadow-[0_10px_30px_rgba(12,21,56,0.05)]">
        <header className="flex flex-col gap-4 border-b border-[var(--splity-line)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#087f6f]">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="splity-display text-xl font-extrabold tracking-tight text-[var(--splity-ink)]">
                {t("settings.profileTitle")}
              </h2>
              <p className="mt-1 text-sm leading-5 text-[var(--splity-muted)]">{t("settings.profileBody")}</p>
            </div>
          </div>
          <ProfileEditButton editing={editing} formRef={formRef} onCancel={cancelEdit} setEditing={setEditing} />
        </header>

        <FieldRow hint={t("settings.usernameHintShort")} label={t("settings.username")}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[var(--splity-ink)]">@</span>
            <span className="relative min-w-0 flex-1">
              <input
                autoComplete="username"
                className={inputClass(editing)}
                maxLength={USERNAME_MAX_LENGTH}
                minLength={3}
                name="username"
                onChange={(event) => {
                  latestUsernameRef.current = event.target.value;
                  setUsernameValue(event.target.value);
                }}
                pattern="[a-z0-9._-]{3,30}"
                placeholder={t("settings.usernamePlaceholder")}
                required
                readOnly={!editing}
                value={usernameValue}
              />
              <CharacterCounter maxLength={USERNAME_MAX_LENGTH} value={usernameValue} />
            </span>
          </div>
        </FieldRow>

        <FieldRow hint={t("settings.displayNameHint")} label={t("settings.displayName")}>
          <span className="relative block">
            <input
              autoComplete="name"
              className={inputClass(editing)}
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              name="name"
              onChange={(event) => {
                latestNameRef.current = event.target.value;
                setNameValue(event.target.value);
              }}
              placeholder={t("settings.displayNamePlaceholder")}
              required
              readOnly={!editing}
              value={nameValue}
            />
            <CharacterCounter maxLength={DISPLAY_NAME_MAX_LENGTH} value={nameValue} />
          </span>
        </FieldRow>
      </section>
    </form>
  );
}
