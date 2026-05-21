type PageHeaderProps = {
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  title: React.ReactNode;
};

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-5">
      <div>
        {eyebrow ? <p className="text-sm font-semibold text-zinc-500">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
