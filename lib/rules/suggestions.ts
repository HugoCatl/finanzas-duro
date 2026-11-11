import type { Category, Recurring, Transaction } from '@/lib/types';
import type { PortfolioSummary } from '@/lib/finance/holdings';
import { spendByCategory } from '@/lib/finance/month';
import { addMonths, monthOf } from '@/lib/dates';
import { eur, pct } from '@/lib/format';

export interface Suggestion { id: string; title: string; body: string }

export interface SuggestionInput {
  today: string;
  categories: Category[];
  transactions: Transaction[];
  recurring: Recurring[];
  portfolio: PortfolioSummary;
}

export function buildSuggestions(input: SuggestionInput): Suggestion[] {
  const { today, categories, transactions, recurring, portfolio } = input;
  const month = monthOf(today);
  const out: Suggestion[] = [];
  const expenseCats = categories.filter((c) => c.kind === 'expense');

  // 1. Categoría con subida >= 25 % y >= 20 € respecto al mes anterior
  const now = spendByCategory(transactions, month);
  const prev = spendByCategory(transactions, addMonths(month, -1));
  for (const c of expenseCats) {
    const cur = now[c.id] ?? 0;
    const before = prev[c.id] ?? 0;
    if (before > 0 && cur >= before * 1.25 && cur - before >= 20) {
      out.push({
        id: `increase:${c.id}`,
        title: `${c.name}: ${pct((cur - before) / before, { signed: true })} vs el mes pasado`,
        body: `Llevas ${eur(cur)} este mes frente a ${eur(before)} en todo el anterior.`,
      });
    }
  }

  // 2. Efectivo parado con una remunerada disponible
  const cash = portfolio.byKind.cash;
  const bestSavings = portfolio.items
    .filter((i) => i.holding.kind === 'savings' && (i.holding.apy ?? 0) > 0)
    .sort((a, b) => (b.holding.apy ?? 0) - (a.holding.apy ?? 0))[0];
  if (cash > 1000 && bestSavings) {
    const apy = bestSavings.holding.apy ?? 0;
    out.push({
      id: 'idle-cash',
      title: `Tienes ${eur(cash)} sin rentabilidad`,
      body: `En ${bestSavings.holding.name} al ${pct(apy)} serían unos ${eur(cash * apy)} al año.`,
    });
  }

  // 3. Recurrente cuyo importe ha cambiado
  for (const r of recurring) {
    const last = transactions
      .filter((t) => t.recurringId === r.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 2);
    if (last.length === 2 && last[0].amount !== last[1].amount) {
      out.push({
        id: `recurring-changed:${r.id}`,
        title: `${r.name} ha cambiado de importe`,
        body: `Pasó de ${eur(Math.abs(last[1].amount))} a ${eur(Math.abs(last[0].amount))}.`,
      });
    }
  }

  // 5. Límite superado los 3 meses anteriores
  const last3 = [1, 2, 3].map((i) => spendByCategory(transactions, addMonths(month, -i)));
  for (const c of expenseCats) {
    if (!c.monthlyLimit) continue;
    const spends = last3.map((m) => m[c.id] ?? 0);
    if (spends.every((s) => s > c.monthlyLimit!)) {
      const avg = spends.reduce((a, b) => a + b, 0) / 3;
      out.push({
        id: `raise-limit:${c.id}`,
        title: `${c.name}: 3 meses por encima del límite`,
        body: `Gastas de media ${eur(avg)} y tu límite es ${eur(c.monthlyLimit)}. ¿Lo ajustas?`,
      });
    }
  }

  return out;
}
