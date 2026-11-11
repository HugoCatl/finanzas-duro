import type { Category, Recurring } from '@/lib/types';
import { addMonths, monthOf } from '@/lib/dates';
import { r2 } from './holdings';
import { recurringKind } from './recurring';

/**
 * Ahorro mensual esperado: ingresos fijos menos lo previsto de gasto. Por categoría cuenta lo mayor entre
 * su límite y sus fijos (un fijo dentro de una categoría con límite no se cuenta dos veces).
 */
export function monthlyPace(recurring: Recurring[], categories: Category[]): number {
  // Traspasos y planes de inversión mueven dinero entre tus cuentas: no restan ahorro.
  const active = recurring.filter((r) => r.active && (recurringKind(r) === 'expense' || recurringKind(r) === 'income'));
  const income = active.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const fixedByCat = new Map<string | null, number>();
  for (const r of active) {
    if (r.amount < 0) fixedByCat.set(r.categoryId, (fixedByCat.get(r.categoryId) ?? 0) - r.amount);
  }
  let planned = 0;
  for (const c of categories) {
    if (c.kind !== 'expense') continue;
    planned += Math.max(c.monthlyLimit ?? 0, fixedByCat.get(c.id) ?? 0);
    fixedByCat.delete(c.id);
  }
  for (const rest of fixedByCat.values()) planned += rest; // fijos sin categoría o de categorías de ingreso
  return r2(income - planned);
}

export interface GoalProgress {
  pct: number; // 0..1
  remaining: number;
  /** Mes (YYYY-MM) en que se llegaría al ritmo actual; null si ya se llegó o no hay ritmo positivo. */
  eta: string | null;
  months: number | null;
}

export function goalProgress(target: number, current: number, pace: number, today: string): GoalProgress {
  const remaining = r2(Math.max(0, target - current));
  const pct = target > 0 ? Math.min(1, Math.max(0, current / target)) : 0;
  if (remaining === 0 || pace <= 0) return { pct, remaining, eta: null, months: null };
  const months = Math.ceil(remaining / pace);
  return { pct, remaining, months, eta: addMonths(monthOf(today), months) };
}
