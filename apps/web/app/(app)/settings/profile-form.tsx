"use client";

import { ArrowRight, Pencil } from "lucide-react";
import { useActionState, useEffect, type ReactNode } from "react";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { useTranslation } from "@/lib/i18n";
import { updateProfileAction, type SettingsActionState } from "./actions";

type ProfileFormProps = {
  formId?: string;
  name: string;
  username: string;
};

const initialState: SettingsActionState = { error: null, success: null };

function FieldRow({
  children,
  hint,
  label,
  editLabel,
}: {
  children: ReactNode;
  editLabel: string;
  hint: string;
  label: string;
}) {
  return (
    <div className="grid min-h-[74px] gap-3 rounded-xl border border-[var(--splity-line)] bg-[#fffefa] px-4 py-4 sm:grid-cols-[minmax(150px,0.18fr)_1fr_auto] sm:items-center">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--splity-gold-strong)]">
          {label}
        </p>
        <p className="mt-1 text-xs text-[var(--splity-muted)]">{hint}</p>
      </div>
      {children}
      <button
        aria-label={editLabel}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--splity-line)] bg-white text-[var(--splity-muted)] transition hover:border-[var(--splity-line-strong)] hover:text-[var(--splity-ink)] sm:justify-self-end"
        type="button"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ProfileForm({ formId, name, username }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);
  const cleanUsername = username.replace(/^@+/, "");
  const { t } = useTranslation();

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state.error, state.success]);

  return (
    <form action={formAction} className="grid gap-3" id={formId}>
      <FieldRow
        editLabel={t("settings.editUsername")}
        hint={`splity.app/u/${cleanUsername || t("settings.usernamePlaceholder")}`}
        label={t("settings.username")}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-[var(--splity-ink)]">@</span>
          <input
            autoComplete="username"
            className="min-h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-0 text-sm font-bold text-[var(--splity-ink)] outline-none transition placeholder:text-[var(--splity-muted)] focus:border-[var(--splity-line-strong)] focus:bg-white focus:px-3"
            defaultValue={cleanUsername}
            maxLength={30}
            minLength={3}
            name="username"
            pattern="[a-z0-9._-]{3,30}"
            placeholder={t("settings.usernamePlaceholder")}
            required
          />
          <span className="inline-flex h-7 items-center rounded-full bg-emerald-50 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700 before:mr-2 before:text-emerald-500 before:content-['•']">
            {t("settings.usernameAvailable")}
          </span>
        </div>
      </FieldRow>

      <FieldRow editLabel={t("settings.editDisplayName")} hint={t("settings.displayNameHint")} label={t("settings.displayName")}>
        <input
          autoComplete="name"
          className="min-h-9 w-full rounded-lg border border-transparent bg-transparent px-0 text-sm font-bold text-[var(--splity-ink)] outline-none transition placeholder:text-[var(--splity-muted)] focus:border-[var(--splity-line-strong)] focus:bg-white focus:px-3"
          defaultValue={name}
          maxLength={150}
          name="name"
          placeholder={t("settings.displayNamePlaceholder")}
          required
        />
      </FieldRow>

      <Alert tone="error">{state.error}</Alert>
      <Alert tone="success">{state.success}</Alert>
      <div className="mt-2 flex justify-end border-t border-dashed border-[var(--splity-line)] pt-4">
        <PendingActionButton className="rounded-full px-6" type="submit">
          {t("common.saveChanges")}
          <ArrowRight className="h-4 w-4" />
        </PendingActionButton>
      </div>
    </form>
  );
}
