import type { Snapshot, Transaction } from '@/lib/types';
import { normalizeMerchant } from '@/lib/transactions/learn';
import { monthlySeries } from './month';
import { r2 } from './holdings';

export interface YearSummary {
  income: number;
  spent: number;
  saved: number;
  savingRate: number | null; // ahorrado / ingresado
  months: { month: string; income: number; spent: number }[];
  byCategory: { categoryId: string | null; spent: number }[]; // de más a menos
  topMerchant: { name: string; spent: number; count: number } | null;
  bestMonth: { month: string; saved: number } | null; // el que más ahorró
  worstMonth: { month: string; spent: number } | null; // el que más gastó
  netWorthStart: number | null; // al cerrar el año anterior (o la primera foto del año)
  netWorthEnd: number | null; // la última foto del año
}

/** Resumen de un año: totales, mes a mes, categorías, comercio estrella y cómo cambió el patrimonio. */
export function yearSummary(txs: Transaction[], snapshots: Snapshot[], year: number): YearSummary {
  const prefix = String(year);
  const inYear = txs.filter((t) => t.date.startsWith(prefix));
  const months = monthlySeries(inYear, `${year}-12`, 12);
  const income = r2(months.reduce((s, m) => s + m.income, 0));
  const spent = r2(months.reduce((s, m) => s + m.spent, 0));
  const active = months.filter((m) => m.income > 0 || m.spent > 0);

  const cat = new Map<string | null, number>();
  const merch = new Map<string, { name: string; spent: number; count: number }>();
  for (const t of inYear) {
    if (t.amount >= 0) continue;
    cat.set(t.categoryId, (cat.get(t.categoryId) ?? 0) - t.amount);
    const key = normalizeMerchant(t.merchant);
    if (!key) continue;
    const m = merch.get(key) ?? { name: t.merchant!.trim(), spent: 0, count: 0 };
    m.spent -= t.amount;
    m.count++;
    merch.set(key, m);
  }
  const top = [...merch.values()].sort((a, b) => b.spent - a.spent)[0];

  const ordered = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const before = ordered.filter((s) => s.date < `${year}-01-01`).at(-1) ?? ordered.find((s) => s.date.startsWith(prefix));
  const last = ordered.filter((s) => s.date.startsWith(prefix)).at(-1);

  const best = active.reduce<typeof active[number] | null>((b, m) => (!b || m.income - m.spent > b.income - b.spent ? m : b), null);
  const worst = active.reduce<typeof active[number] | null>((w, m) => (!w || m.spent > w.spent ? m : w), null);

  return {
    income, spent, saved: r2(income - spent),
    savingRate: income > 0 ? (income - spent) / income : null,
    months,
    byCategory: [...cat].map(([categoryId, v]) => ({ categoryId, spent: r2(v) })).sort((a, b) => b.spent - a.spent),
    topMerchant: top ? { ...top, spent: r2(top.spent) } : null,
    bestMonth: best ? { month: best.month, saved: r2(best.income - best.spent) } : null,
    worstMonth: worst ? { month: worst.month, spent: worst.spent } : null,
    netWorthStart: before?.netWorth ?? null,
    netWorthEnd: last?.netWorth ?? null,
  };
}
