import type { Category, Transaction } from '@/lib/types';
import type { AlertCandidate } from './alerts';
import { addMonths, dayOfMonth, daysInMonth, monthOf } from '@/lib/dates';
import { spendByCategory } from '@/lib/finance/month';
import { eur, monthLabel } from '@/lib/format';

export interface MonthlySummaryInput {
  today: string;
  categories: Category[];
  transactions: Transaction[];
  /** Cambio del patrimonio desde el cierre del mes anterior (null si no hay foto de entonces). */
  netWorthMonth: number | null;
}

const sums = (txs: Transaction[], month: string) => {
  let income = 0;
  let spent = 0;
  for (const t of txs) {
    if (monthOf(t.date) !== month) continue;
    if (t.amount > 0) income += t.amount;
    else spent -= t.amount;
  }
  return { income, spent };
};

/** Resumen del mes que se envía el último día por la noche; cualquier otro día no hay nada. */
export function monthlySummary({ today, categories, transactions, netWorthMonth }: MonthlySummaryInput): AlertCandidate | null {
  const month = monthOf(today);
  if (dayOfMonth(today) !== daysInMonth(month)) return null;

  const { income, spent } = sums(transactions, month);
  if (income === 0 && spent === 0) return null;
  const prev = sums(transactions, addMonths(month, -1)).spent;

  const parts = [`Gastaste ${eur(spent, { whole: true })}`];
  if (prev > 0) {
    const diff = (spent - prev) / prev;
    parts[0] += Math.abs(diff) < 0.02 ? ', como el mes pasado' : ` (${diff > 0 ? '+' : '−'}${Math.round(Math.abs(diff) * 100)} % que el mes pasado)`;
  }
  if (income > 0) parts.push(`ingresaste ${eur(income, { whole: true })} y ahorraste ${eur(income - spent, { whole: true })}`);

  const top = Object.entries(spendByCategory(transactions, month))
    .filter(([id]) => id !== 'none')
    .sort((a, b) => b[1] - a[1])[0];
  const topName = top && categories.find((c) => c.id === top[0])?.name;

  let body = `${parts.join(', ')}.`;
  if (topName) body += ` Donde más: ${topName} (${eur(top[1], { whole: true })}).`;
  if (netWorthMonth !== null) body += ` Patrimonio ${eur(netWorthMonth, { signed: true, whole: true })}.`;

  return {
    kind: 'monthly_summary', categoryId: null, threshold: null, ref: month,
    title: `Tu ${monthLabel(month).toLowerCase().replace(/ \d{4}$/, '')} en resumen`,
    body,
  };
}
