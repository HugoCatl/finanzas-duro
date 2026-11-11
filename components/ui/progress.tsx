import type { BudgetLevel } from '@/lib/finance/month';

export function Progress({ pct, level }: { pct: number | null; level: BudgetLevel }) {
  const width = Math.min(100, Math.max(0, (pct ?? 0) * 100));
  const color = level === 'over' ? 'bg-loss' : level === 'warn' ? 'bg-warn' : 'bg-accent';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar"
      aria-valuenow={Math.round(width)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full origin-left animate-grow rounded-full ${color} transition-[width] duration-500 ease-soft`} style={{ width: `${width}%` }} />
    </div>
  );
}
