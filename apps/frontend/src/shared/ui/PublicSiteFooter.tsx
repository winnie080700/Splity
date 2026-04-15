import { useI18n } from "@/shared/i18n/I18nProvider";

type PublicSiteFooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

export function PublicSiteFooter({
  links = [],
  className = ""
}: {
  links?: PublicSiteFooterLink[];
  className?: string;
}) {
  const { t } = useI18n();

  return (
    <footer className={className}>
      <div className="border-t border-slate-200/90 px-1 py-4">
        <div className="flex flex-col gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-amber-700/80 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span>+</span>
            <span>{t("app.title")}</span>
            <span>2026</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span>{t("landing.footerMadeWith")}</span>
            {links.map((link) => (
              <a
                key={`${link.href}:${link.label}`}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noreferrer noopener" : undefined}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
