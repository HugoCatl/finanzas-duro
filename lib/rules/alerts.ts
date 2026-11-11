import type { Category, Settings, Transaction } from '@/lib/types';
import { budgetStatus, projectedSpend } from '@/lib/finance/month';
import { dayOfMonth, daysBetween, monthOf } from '@/lib/dates';
import { eur, pct } from '@/lib/format';

export type AlertKind = 'category_threshold' | 'total_threshold' | 'pace' | 'uncategorized' | 'big_expense' | 'monthly_summary' | 'plan_no_cash';

export interface AlertCandidate {
  kind: AlertKind;
  categoryId: string | null;
  threshold: number | null;
  ref: string | null;
  title: string;
  body: string;
}

export interface AlertInput { today: string; categories: Category[]; transactions: Transaction[]; settings: Settings }

const crossed = (p: number | null): 80 | 100 | null => (p === null ? null : p >= 1 ? 100 : p >= 0.8 ? 80 : null);

export function evaluateAlerts({ today, categories, transactions, settings }: AlertInput): AlertCandidate[] {
  const month = monthOf(today);
  const monthTxs = transactions.filter((t) => monthOf(t.date) === month);
  const status = budgetStatus(categories, monthTxs, month);
  const out: AlertCandidate[] = [];

  for (const c of status.categories) {
    const t = crossed(c.pct);
    if (t === null) continue;
    out.push({
      kind: 'category_threshold', categoryId: c.category.id, threshold: t, ref: null,
      title: t === 100 ? `Te has pasado en ${c.category.name}` : `${c.category.name} al ${pct(c.pct)}`,
      body: `Llevas ${eur(c.spent)} de ${eur(c.limit ?? 0)} este mes.`,
    });
  }

  const totalT = crossed(status.pct);
  if (totalT !== null) {
    out.push({
      kind: 'total_threshold', categoryId: null, threshold: totalT, ref: null,
      title: totalT === 100 ? 'Has superado tu presupuesto del mes' : `Presupuesto del mes al ${pct(status.pct)}`,
      body: `Llevas ${eur(status.spent)} de ${eur(status.limit)}.`,
    });
  }

  if (status.limit > 0 && dayOfMonth(today) >= 10 && status.spent < status.limit) {
    const projected = projectedSpend(status.spent, today);
    if (projected > status.limit) {
      out.push({
        kind: 'pace', categoryId: null, threshold: null, ref: null,
        title: 'A este ritmo te pasarás del presupuesto',
        body: `Proyección: ${eur(projected)} frente a ${eur(status.limit)}.`,
      });
    }
  }

  const stale = monthTxs.filter((t) => t.amount < 0 && t.categoryId === null && daysBetween(t.date, today) > 3);
  if (stale.length > 0) {
    out.push({
      kind: 'uncategorized', categoryId: null, threshold: null, ref: null,
      title: 'Tienes gastos sin categorizar',
      body: `${stale.length} gasto${stale.length > 1 ? 's' : ''} esperando categoría.`,
    });
  }

  for (const t of monthTxs) {
    if (t.amount < 0 && -t.amount > settings.bigExpenseThreshold) {
      out.push({
        kind: 'big_expense', categoryId: null, threshold: null, ref: t.id,
        title: `Gasto alto: ${eur(-t.amount)}`,
        body: t.merchant ? `En ${t.merchant}.` : 'Revisa si está bien categorizado.',
      });
    }
  }

  return out;
}
