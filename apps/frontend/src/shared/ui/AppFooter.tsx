import { useI18n } from "@/shared/i18n/I18nProvider";
import { GlobeIcon } from "@/shared/ui/icons";

export function AppFooter({ className = "" }: { className?: string }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <footer className={className}>
      <div className="border-t border-slate-200/80 px-1 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-medium tracking-[0.08em] text-muted">
            {t("footer.copyright")}
          </div>

          <label className="select-shell self-start sm:self-auto">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-brand">
              <GlobeIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {t("lang.language")}
            </span>
            <select
              aria-label={t("lang.language")}
              className="select-base select-compact min-w-[9.5rem] rounded-full"
              value={language}
              onChange={(event) => setLanguage(event.target.value as "en" | "zh")}
            >
              <option value="en">{t("lang.english")}</option>
              <option value="zh">{t("lang.chinese")}</option>
            </select>
          </label>
        </div>
      </div>
    </footer>
  );
}
