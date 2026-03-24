import { useEffect, type ReactNode } from "react";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function ModalDialog({
  open,
  title,
  description,
  children,
  onClose,
  actions,
  className
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-950/36 backdrop-blur-[3px]"
        onClick={onClose}
        type="button"
      />
      <div className={cn("panel-surface scroll-panel relative z-[81] max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto", className)}>
        <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 px-6 py-5 backdrop-blur sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">{title}</h2>
              {description ? <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p> : null}
            </div>
            <button
              className="button-pill shrink-0"
              onClick={onClose}
              type="button"
              aria-label="Close dialog"
            >
              x
            </button>
          </div>
        </div>
        <div className="px-6 py-6 sm:px-7">
          {children}
        </div>
        {actions ? (
          <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-3 border-t border-slate-200/80 bg-white/95 px-6 py-4 backdrop-blur sm:px-7">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
