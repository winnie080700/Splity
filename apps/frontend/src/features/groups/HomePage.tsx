import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "@api-client";
import { saveGroup, readSavedGroups } from "@/shared/utils/storage";
import { useMemo, useState } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";

export function HomePage() {
  const [name, setName] = useState("");
  const [savedVersion, setSavedVersion] = useState(0);
  const { t } = useI18n();

  const groups = useMemo(() => readSavedGroups(), [savedVersion]);

  const createGroup = useMutation({
    mutationFn: () => apiClient.createGroup(name.trim()),
    onSuccess: (group) => {
      saveGroup({ id: group.id, name: group.name });
      setSavedVersion((v) => v + 1);
      setName("");
    }
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card p-5">
        <h2 className="text-lg font-semibold">{t("home.createGroup")}</h2>
        <p className="mt-1 text-sm text-ink/70">{t("home.demoMode")}</p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) {
              return;
            }
            createGroup.mutate();
          }}
        >
          <input
            className="w-full rounded-xl border border-ink/20 px-3 py-2"
            placeholder={t("home.groupPlaceholder")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button
            className="rounded-xl bg-ink px-4 py-2 text-white disabled:opacity-60"
            disabled={createGroup.isPending}
            type="submit"
          >
            {t("home.create")}
          </button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">{t("home.recentGroups")}</h2>
        <ul className="mt-3 space-y-2">
          {groups.length === 0 && <li className="text-sm text-ink/70">{t("home.noGroup")}</li>}
          {groups.map((group) => (
            <li key={group.id} className="rounded-xl border border-ink/10 bg-white p-3">
              <div className="font-medium">{group.name}</div>
              <div className="mt-2 flex gap-2 text-sm">
                <Link className="rounded-full bg-sky px-3 py-1" to={`/groups/${group.id}/participants`}>{t("home.participants")}</Link>
                <Link className="rounded-full bg-mint px-3 py-1" to={`/groups/${group.id}/bills`}>{t("home.bills")}</Link>
                <Link className="rounded-full bg-amber px-3 py-1" to={`/groups/${group.id}/settlements`}>{t("home.settlement")}</Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5 md:col-span-2">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-ink/10 bg-white p-4">
            <h3 className="font-semibold">{t("home.quickStart")}</h3>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink/80">
              <li>{t("home.quickStart1")}</li>
              <li>{t("home.quickStart2")}</li>
              <li>{t("home.quickStart3")}</li>
              <li>{t("home.quickStart4")}</li>
            </ol>
          </article>
          <article className="rounded-2xl border border-ink/10 bg-gradient-to-br from-sky/30 to-mint/30 p-4">
            <h3 className="font-semibold">{t("home.defaultInfo")}</h3>
            <p className="mt-2 text-sm text-ink/80">{t("home.defaultInfoBody")}</p>
            <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-sm">
              <span className="font-medium">{t("home.tip")}: </span>
              {t("home.tipBody")}
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
