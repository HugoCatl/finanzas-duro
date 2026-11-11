import type { Recurring } from '@/lib/types';
import { addMonths, daysInMonth, monthOf } from '@/lib/dates';

export type RecurringKind = 'expense' | 'income' | 'transfer' | 'plan';

/** Gasto/ingreso normal, traspaso entre cuentas o plan de inversión (compra periódica). */
export function recurringKind(r: Pick<Recurring, 'amount' | 'transferAccountId' | 'holdingId'>): RecurringKind {
  if (r.transferAccountId) return 'transfer';
  if (r.holdingId) return 'plan';
  return r.amount < 0 ? 'expense' : 'income';
}

/** Días de margen tras el día efectivo en los que aún se crea el movimiento. */
export const RECURRING_WINDOW_DAYS = 2;

/** Día efectivo de un recurrente en el mes (el 31 en febrero cae el 28/29). */
export function effectiveDay(r: Recurring, month: string): number {
  return Math.min(r.dayOfMonth, daysInMonth(month));
}

/** Fecha efectiva (YYYY-MM-DD) del recurrente en el mes. */
export function effectiveDate(r: Recurring, month: string): string {
  return `${month}-${String(effectiveDay(r, month)).padStart(2, '0')}`;
}

/**
 * Recurrentes cuyo día efectivo es hoy o de hace como mucho 2 días (recupera un cron perdido),
 * y que aún no tienen movimiento este mes. Fuera de esa ventana no se crean, para que un
 * movimiento borrado a mano no reaparezca ni se dupliquen al darlos de alta a mitad de mes.
 */
export function dueRecurring(recurring: Recurring[], created: { recurringId?: string | null; date: string }[], today: string): Recurring[] {
  const month = monthOf(today);
  // `created`: movimientos, traspasos y compras ya apuntados por un fijo.
  const done = new Set(created.filter((t) => t.recurringId && monthOf(t.date) === month).map((t) => t.recurringId));
  const day = Number(today.slice(8, 10));
  return recurring.filter((r) => {
    if (!r.active || done.has(r.id)) return false;
    const late = day - effectiveDay(r, month);
    return late >= 0 && late <= RECURRING_WINDOW_DAYS;
  });
}

/** Compra de un plan de inversión al último precio: participaciones = importe / precio. Sin precio no se compra. */
export function planBuy(amountEur: number, priceEur: number | undefined): { quantity: number; unitPriceEur: number } | null {
  if (!priceEur || priceEur <= 0 || !(amountEur > 0)) return null;
  return { quantity: Math.round((amountEur / priceEur) * 1e8) / 1e8, unitPriceEur: priceEur };
}

/** Próximos `n` fijos activos a partir de hoy (este mes o el siguiente), con su fecha. */
export function upcomingRecurring(recurring: Recurring[], today: string, n: number): { recurring: Recurring; date: string }[] {
  const month = monthOf(today);
  const next = addMonths(month, 1);
  return recurring
    .filter((r) => r.active)
    .map((r) => {
      const date = effectiveDate(r, month);
      return { recurring: r, date: date >= today ? date : effectiveDate(r, next) };
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, n);
}
