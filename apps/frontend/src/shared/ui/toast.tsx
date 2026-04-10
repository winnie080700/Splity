import { createContext, useContext, useState, type ReactNode } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  title: string;
  description: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { t } = useI18n();

  function dismissToast(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function showToast(toast: Omit<ToastItem, "id">) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, ...toast }]);

    window.setTimeout(() => {
      dismissToast(id);
    }, 4200);
  }

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:justify-end">
        <div className="flex w-full max-w-sm flex-col gap-3">
          {toasts.map((toast) => {
            const toneClasses = {
              info: "border-sky bg-white text-ink",
              success: "border-mint bg-white text-ink",
              error: "border-rose-200 bg-white text-ink"
            }[toast.tone];

            const accentClasses = {
              info: "bg-brand",
              success: "bg-success",
              error: "bg-danger"
            }[toast.tone];

            return (
              <div
                key={toast.id}
                className={`pointer-events-auto overflow-hidden rounded-[22px] border shadow-lift ${toneClasses}`}
                role="status"
                aria-live="polite"
              >
                <div className={`h-1.5 ${accentClasses}`} />
                <div className="flex items-center justify-between gap-4 px-4 py-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{toast.title}</div>
                    <div className="mt-1 text-sm leading-6 text-muted">{toast.description}</div>
                  </div>
                  <button
                    className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-muted hover:border-slate-300 hover:text-ink"
                    onClick={() => dismissToast(toast.id)}
                    type="button"
                  >
                    {t("common.dismiss")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
