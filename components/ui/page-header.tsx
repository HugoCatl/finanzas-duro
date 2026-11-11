export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4 pb-6 pt-5 lg:pt-0">
      <div>
        <h1 className="text-title">{title}</h1>
        {subtitle && <p className="text-small text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
