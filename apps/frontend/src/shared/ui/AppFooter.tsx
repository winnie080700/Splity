export function AppFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={className}>
      <div className="border-t border-slate-200/80 px-1 py-3">
        <div className="text-center text-xs font-medium tracking-[0.08em] text-muted">Splity (c) - 2026</div>
      </div>
    </footer>
  );
}
