import type { Metadata } from "next";
import { Toaster } from "sonner";

import "./globals.css";
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
        </I18nProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
