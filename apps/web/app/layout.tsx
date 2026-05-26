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
          <div className="m-2 flex items-center justify-between gap-4 border-t border-[var(--splity-line)] px-10 py-4 text-xs uppercase text-[var(--splity-muted)] sm:px-20">
            <span><T k="app.footerLeft" /></span>
            <span><T k="app.footerRight" /></span>
            <LanguageSelect />
          </div>
        </I18nProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
