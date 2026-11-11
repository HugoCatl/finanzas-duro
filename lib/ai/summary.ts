import type { AppData, Snapshot } from '@/lib/types';
import type { PortfolioSummary } from '@/lib/finance/holdings';
import { monthTotals, spendByCategory } from '@/lib/finance/month';
import { addDays, addMonths, daysInMonth, monthOf } from '@/lib/dates';

export { AI_MODEL } from '@/lib/ai/model';

export const SUMMARY_SYSTEM = [
  'Eres un asistente de finanzas personales. Escribe en español de España, en segunda persona, con tono cercano y directo.',
  'Máximo 180 palabras. Usa exactamente tres apartados con estos títulos en negrita: **Cómo ha ido**, **Lo que destaca**, **Para el mes que viene**.',
  'Usa solo las cifras que te doy; no inventes datos.',
  'No recomiendes productos financieros concretos ni des asesoramiento de inversión personalizado.',
].join(' ');

export interface SummaryInput {
  month: string;
  income: number;
  spent: number;
  saved: number;
  invested: number;
  byCategory: { name: string; spent: number; limit: number | null; prevMonthSpent: number }[];
  netWorth: number;
  netWorthChangeVsPrevMonth: number | null;
}

function valueAt(snapshots: Snapshot[], date: string): number | null {
  let best: Snapshot | null = null;
  for (const s of snapshots) if (s.date <= date && (!best || s.date > best.date)) best = s;
  return best ? best.netWorth : null;
}

export function buildSummaryInput(data: AppData, month: string, pf: PortfolioSummary): SummaryInput {
  const totals = monthTotals(data.transactions, data.events, data.holdings, month);
  const now = spendByCategory(data.transactions, month);
  const prev = spendByCategory(data.transactions, addMonths(month, -1));
  const cats = new Map(data.categories.map((c) => [c.id, c]));
  const ids = [...new Set([...Object.keys(now), ...Object.keys(prev)])];
  const byCategory = ids
    .map((id) => ({
      name: id === 'none' ? 'Sin categoría' : cats.get(id)?.name ?? 'Otra',
      spent: now[id] ?? 0,
      limit: cats.get(id)?.monthlyLimit ?? null,
      prevMonthSpent: prev[id] ?? 0,
    }))
    .sort((a, b) => b.spent - a.spent);

  const isCurrent = month === monthOf(data.today);
  const endOfMonth = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
  const netWorth = isCurrent ? pf.total : valueAt(data.snapshots, endOfMonth) ?? pf.total;
  const prevClose = valueAt(data.snapshots, addDays(`${month}-01`, -1));

  return {
    month,
    ...totals,
    byCategory,
    netWorth,
    netWorthChangeVsPrevMonth: prevClose === null ? null : Math.round((netWorth - prevClose) * 100) / 100,
  };
}

export function summaryPrompt(input: SummaryInput): string {
  return `Resumen de mis finanzas del mes ${input.month} (importes en EUR):\n${JSON.stringify(input, null, 2)}`;
}

export const SUMMARY_COOLDOWN_MS = 60_000;

/** true si el último resumen del usuario es más reciente que el tiempo de espera. */
export function isOnCooldown(lastCreatedAt: string | null, nowMs: number, cooldownMs = SUMMARY_COOLDOWN_MS): boolean {
  if (!lastCreatedAt) return false;
  const last = Date.parse(lastCreatedAt);
  if (Number.isNaN(last)) return false;
  return nowMs - last < cooldownMs;
}
