import type { Holding, HoldingEvent } from '@/lib/types';
import { daysBetween, monthOf } from '@/lib/dates';
import type { Closes } from './position-history';
import type { Flow } from './xirr';

/** Inflación supuesta cuando Eurostat no responde. */
export const FALLBACK_INFLATION = 0.025;
/** La cuenta remunerada con la que se compara. */
export const SAVINGS_RATE = 0.02;
/** Tipos que cuentan como "invertido". */
export const INVESTED_KINDS: Holding['kind'][] = ['fund', 'stock', 'crypto'];

/** Rentabilidad total de una referencia con tus mismos flujos; `estimated` si se usó un dato aproximado. */
export interface Comparison { pct: number; estimated?: boolean }

/** Solo lo que pones y lo que sacas (sin valoraciones): − al meter dinero, + al sacarlo. */
export function contributionFlows(events: HoldingEvent[]): Flow[] {
  const flows: Flow[] = [];
  for (const e of events) {
    if (e.amountEur <= 0) continue;
    if (e.type === 'buy' || e.type === 'deposit') flows.push({ date: e.date, amount: -e.amountEur });
    else if (e.type === 'sell' || e.type === 'withdrawal') flows.push({ date: e.date, amount: e.amountEur });
  }
  return flows.sort((a, b) => a.date.localeCompare(b.date));
}

/** Los flujos de toda la cartera invertida (fondos, acciones y cripto activos). */
export function portfolioFlows(events: HoldingEvent[], holdings: Holding[]): Flow[] {
  const ids = new Set(holdings.filter((h) => !h.archived && INVESTED_KINDS.includes(h.kind)).map((h) => h.id));
  return contributionFlows(events.filter((e) => ids.has(e.holdingId)));
}

const netIn = (flows: Flow[]) => -flows.reduce((s, f) => s + f.amount, 0);

/** Lo que tendrías hoy si cada flujo hubiera ido a una referencia que multiplica el dinero por `growth(date)`. */
function compare(flows: Flow[], growth: (date: string) => number | null): number | null {
  const net = netIn(flows);
  if (net <= 0) return null;
  let value = 0;
  for (const f of flows) {
    const g = growth(f.date);
    if (g === null) return null;
    value += -f.amount * g;
  }
  return value / net - 1;
}

/** Tu rentabilidad total con la misma base que las referencias: (valor − aportado neto) / aportado neto. */
export function ownReturn(flows: Flow[], value: number): number | null {
  const net = netIn(flows);
  return net > 0 ? value / net - 1 : null;
}

/** Como si cada euro hubiera comprado el índice a su cierre de ese día (o el anterior más cercano). */
export function benchmarkReturn(flows: Flow[], closes: Closes | null): Comparison | null {
  if (!closes) return null;
  const dates = Object.keys(closes).sort();
  if (dates.length === 0) return null;
  const last = closes[dates[dates.length - 1]];
  const closeOn = (date: string) => {
    let c: number | null = null;
    for (const d of dates) { if (d > date) break; c = closes[d]; }
    return c;
  };
  const pct = compare(flows, (date) => { const c = closeOn(date); return c ? last / c : null; });
  return pct === null ? null : { pct };
}

/** Una cuenta al `rate` TAE con interés compuesto diario hasta hoy. */
export function savingsReturn(flows: Flow[], today: string, rate = SAVINGS_RATE): Comparison | null {
  const pct = compare(flows, (date) => Math.pow(1 + rate, Math.max(0, daysBetween(date, today)) / 365));
  return pct === null ? null : { pct };
}

/**
 * Cuánto tendría que haber crecido tu dinero para no perder poder de compra. Con el índice mensual de precios
 * (YYYY-MM → índice); sin él, o si no cubre las fechas, con un 2,5 % anual marcado como estimado.
 */
export function inflationReturn(flows: Flow[], today: string, monthly: Record<string, number> | null): Comparison | null {
  if (monthly) {
    const months = Object.keys(monthly).sort();
    if (months.length > 0) {
      const latest = monthly[months[months.length - 1]];
      const pct = compare(flows, (date) => {
        const m = monthOf(date);
        if (m < months[0]) return null;
        // Los meses más recientes aún no publicados usan el último dato.
        const idx = monthly[m] ?? latest;
        return latest / idx;
      });
      if (pct !== null) return { pct };
    }
  }
  const pct = compare(flows, (date) => Math.pow(1 + FALLBACK_INFLATION, Math.max(0, daysBetween(date, today)) / 365));
  return pct === null ? null : { pct, estimated: true };
}
