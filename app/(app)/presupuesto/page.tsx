import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { getAppData } from '@/lib/data/app-data';
import { learnedCategories } from '@/lib/transactions/learn';
import { monthOf } from '@/lib/dates';
import { eur, monthLabel } from '@/lib/format';
import { budgetStatus, projectedSpend } from '@/lib/finance/month';
import { Card } from '@/components/ui/card';
import { Mascot } from '@/components/advisor/mascot';
import { PageHeader } from '@/components/ui/page-header';
import { Progress } from '@/components/ui/progress';
import { CategoryLimit } from '@/components/budget/category-limit';
import { RecurringEditor } from '@/components/budget/recurring-editor';
import { AddTransaction } from '@/components/transactions/add-transaction';

export default async function PresupuestoPage() {
  const data = await getAppData('budget');
  const month = monthOf(data.today);
  const budget = budgetStatus(data.categories, data.transactions, month);
  const projected = projectedSpend(budget.spent, data.today);
  const active = budget.categories.filter((r) => r.limit !== null || r.spent > 0);
  const idle = budget.categories.filter((r) => r.limit === null && r.spent === 0);

  return (
    <>
      <PageHeader title="Presupuesto" subtitle={monthLabel(month)} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card>
            {budget.limit > 0 ? (
              <>
                <p className="text-small text-muted">{budget.remaining >= 0 ? 'Te quedan' : 'Te has pasado'}</p>
                <p className={`num text-hero ${budget.remaining < 0 ? 'text-loss' : ''}`}>{eur(Math.abs(budget.remaining))}</p>
                <p className="mb-4 mt-1 text-small text-muted">Gastado {eur(budget.spent)} de {eur(budget.limit)}</p>
                <Progress pct={budget.pct} level={budget.level} />
                <p className="mt-3 text-small text-muted">
                  A este ritmo cerrarás el mes en <span className={`num ${projected > budget.limit ? 'text-warn' : ''}`}>{eur(projected)}</span>.
                </p>
              </>
            ) : (
              <>
                <Mascot size={44} alive />
                <p className="mt-2 text-heading">Aún no tienes presupuesto</p>
                <p className="mt-1 text-small text-muted">
                  Pon límite a 2 o 3 categorías donde más gastas (en «Por categoría») y aquí verás cuánto te queda y a qué ritmo vas.
                  {budget.spent > 0 && <> Este mes llevas <span className="num">{eur(budget.spent)}</span>.</>}
                </p>
              </>
            )}
          </Card>
          <RecurringEditor recurring={data.recurring} categories={data.categories} accounts={data.accounts} holdings={data.holdings}
            kinds={['expense', 'income']}
            footer={<>Traspasos entre cuentas y planes de inversión: en <Link href="/automatico" className="text-text underline-offset-2 hover:underline">Automático</Link>.</>} />
        </div>

        <section>
          <h2 className="mb-2 px-1 text-small font-medium text-muted">Por categoría</h2>
          <Card flush className="divide-y divide-line">
            {active.map((row) => <CategoryLimit key={row.category.id} row={row} />)}
            {idle.length > 0 && (
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-small text-muted">
                  {idle.length === 1 ? '1 categoría' : `${idle.length} categorías`} sin límite ni gasto
                  <ChevronDown size={16} className="transition-transform duration-300 ease-soft group-open:rotate-180" />
                </summary>
                <div className="divide-y divide-line border-t border-line">
                  {idle.map((row) => <CategoryLimit key={row.category.id} row={row} />)}
                </div>
              </details>
            )}
          </Card>
          {budget.uncategorizedSpent > 0 && (
            <p className="mt-3 px-1 text-small text-muted">Sin categoría: <span className="num">{eur(budget.uncategorizedSpent)}</span></p>
          )}
          {budget.unlimitedSpent > 0 && (
            <p className="mt-1 px-1 text-small text-muted">De ese total, en categorías sin límite: <span className="num">{eur(budget.unlimitedSpent)}</span></p>
          )}
        </section>
      </div>
      <AddTransaction categories={data.categories} accounts={data.accounts} today={data.today} learned={learnedCategories(data.transactions)} />
    </>
  );
}
