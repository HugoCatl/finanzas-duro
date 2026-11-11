import Link from 'next/link';
import type { BudgetStatus, MonthTotals } from '@/lib/finance/month';
import { eur, monthLabel } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Money } from '@/components/ui/money';
import { Progress } from '@/components/ui/progress';

/** El mes de un vistazo: cuánto queda del presupuesto y en qué se va. */
export function MonthCard({ month, budget, totals }: { month: string; budget: BudgetStatus; totals: MonthTotals }) {
  const top = budget.categories.filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent).slice(0, 3);
  return (
    <Card>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-heading">{monthLabel(month)}</h2>
        <Link href="/presupuesto" className="text-small text-accent">Presupuesto</Link>
      </div>

      {budget.limit > 0 ? (
        <>
          <p className="text-small text-muted">{budget.remaining >= 0 ? 'Te quedan' : 'Te has pasado'}</p>
          <p className={`num text-title font-light ${budget.remaining < 0 ? 'text-loss' : ''}`}>
            {eur(Math.abs(budget.remaining))}
            <span className="text-body text-muted"> de {eur(budget.limit, { whole: true })}</span>
          </p>
          <div className="mt-3"><Progress pct={budget.pct} level={budget.level} /></div>
        </>
      ) : (
        <p className="text-small text-muted">Pon límites a tus categorías en Presupuesto para ver cuánto te queda.</p>
      )}

      {top.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3">
          {top.map(({ category, spent, limit }) => (
            <li key={category.id} className="flex items-center gap-3">
              <CategoryIcon icon={category.icon} size={16} className="text-muted" />
              <span className="flex-1">{category.name}</span>
              <span className="num">{eur(spent)}{limit !== null && <span className="text-muted"> / {eur(limit, { whole: true })}</span>}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
        <div><dt className="text-small text-muted">Entra</dt><dd className="font-medium"><Money value={totals.income} /></dd></div>
        <div><dt className="text-small text-muted">Sale</dt><dd className="font-medium"><Money value={totals.spent} /></dd></div>
        <div><dt className="text-small text-muted">Invertido</dt><dd className="font-medium"><Money value={totals.invested} /></dd></div>
      </dl>
    </Card>
  );
}
