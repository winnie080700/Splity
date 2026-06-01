import type { Metadata } from "next";
import { Toaster } from "sonner";

import "./globals.css";
import { T } from "@/components/i18n/t";
import { LanguageSelect } from "@/components/i18n/language-select";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Splity",
  description: "Split shared expenses and settle payments clearly.",
  icons: {
    icon: "/splity-logo.svg",
    shortcut: "/splity-logo.svg",
    apple: "/splity-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          {children}
          <div className="m-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--splity-line)] px-3 py-3 text-[10px] uppercase text-[var(--splity-muted)] sm:gap-4 sm:px-10 sm:py-4 sm:text-xs lg:px-20">
            <span><T k="app.footerLeft" /></span>
            <span className="hidden sm:inline"><T k="app.footerRight" /></span>
            <LanguageSelect />
          </div>
        </I18nProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
