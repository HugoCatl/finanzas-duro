import type { Category, Holding, HoldingEvent, Transaction } from '@/lib/types';
import { addMonths, dayOfMonth, daysInMonth, monthOf } from '@/lib/dates';
import { r2 } from './holdings';

export interface MonthTotals { income: number; spent: number; saved: number; invested: number }
export type BudgetLevel = 'ok' | 'warn' | 'over';

export interface CategoryBudget {
  category: Category;
  spent: number;
  limit: number | null;
  remaining: number | null;
  pct: number | null;
  level: BudgetLevel;
}

export interface BudgetStatus {
  limit: number;
  spent: number;
  remaining: number;
  pct: number | null;
  level: BudgetLevel;
  categories: CategoryBudget[];
  uncategorizedSpent: number;
  /** Parte del total gastada en categorías sin límite: cuenta para el total y se enseña aparte. */
  unlimitedSpent: number;
}

const inMonth = (date: string, month: string) => monthOf(date) === month;

export function monthTotals(txs: Transaction[], events: HoldingEvent[], holdings: Holding[], month: string): MonthTotals {
  let income = 0;
  let spent = 0;
  for (const t of txs) {
    if (!inMonth(t.date, month)) continue;
    if (t.amount > 0) income += t.amount;
    else spent += -t.amount;
  }
  const investable = new Set(holdings.filter((h) => h.kind === 'fund' || h.kind === 'crypto' || h.kind === 'stock').map((h) => h.id));
  let invested = 0;
  for (const e of events) {
    if (inMonth(e.date, month) && investable.has(e.holdingId) && (e.type === 'deposit' || e.type === 'buy')) {
      invested += e.amountEur;
    }
  }
  return { income: r2(income), spent: r2(spent), saved: r2(income - spent), invested: r2(invested) };
}

export function budgetLevel(pct: number | null): BudgetLevel {
  if (pct === null) return 'ok';
  if (pct >= 1) return 'over';
  if (pct >= 0.8) return 'warn';
  return 'ok';
}

export function spendByCategory(txs: Transaction[], month: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of txs) {
    if (t.amount >= 0 || !inMonth(t.date, month)) continue;
    const key = t.categoryId ?? 'none';
    out[key] = r2((out[key] ?? 0) - t.amount);
  }
  return out;
}

export function budgetStatus(categories: Category[], txs: Transaction[], month: string): BudgetStatus {
  const spentBy = spendByCategory(txs, month);
  const expenseCats = categories.filter((c) => c.kind === 'expense');
  const rows: CategoryBudget[] = expenseCats.map((category) => {
    const spent = spentBy[category.id] ?? 0;
    const limit = category.monthlyLimit;
    const pct = limit && limit > 0 ? spent / limit : null;
    return {
      category,
      spent,
      limit,
      remaining: limit === null ? null : r2(limit - spent),
      pct,
      level: budgetLevel(pct),
    };
  });
  const limit = r2(expenseCats.reduce((s, c) => s + (c.monthlyLimit ?? 0), 0));
  // Total = todo lo gastado en el mes (con límite, sin límite y sin categoría), frente a la suma de límites.
  const uncategorizedSpent = spentBy.none ?? 0;
  const spent = r2(Object.values(spentBy).reduce((s, v) => s + v, 0));
  const unlimitedSpent = r2(expenseCats.filter((c) => c.monthlyLimit === null).reduce((s, c) => s + (spentBy[c.id] ?? 0), 0));
  const pct = limit > 0 ? spent / limit : null;
  return {
    limit,
    spent,
    remaining: r2(limit - spent),
    pct,
    level: budgetLevel(pct),
    categories: rows,
    uncategorizedSpent,
    unlimitedSpent,
  };
}

export function projectedSpend(spent: number, today: string): number {
  return r2((spent / dayOfMonth(today)) * daysInMonth(monthOf(today)));
}

export function monthlySeries(txs: Transaction[], endMonth: string, n: number) {
  const months = Array.from({ length: n }, (_, i) => addMonths(endMonth, i - n + 1));
  const map = new Map(months.map((m) => [m, { month: m, income: 0, spent: 0 }]));
  for (const t of txs) {
    const row = map.get(monthOf(t.date));
    if (!row) continue;
    if (t.amount > 0) row.income = r2(row.income + t.amount);
    else row.spent = r2(row.spent - t.amount);
  }
  return months.map((m) => map.get(m)!);
}
