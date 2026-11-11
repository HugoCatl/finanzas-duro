import type { HoldingEvent } from '@/lib/types';
import { addDays } from '@/lib/dates';
import { r2 } from './holdings';

/** Un día de la vida de una posición: cuánto valía y cuánto llevabas metido. */
export interface PositionPoint { date: string; value: number; contributed: number }

/** Cierres diarios en EUR por fecha YYYY-MM-DD. */
export type Closes = Record<string, number>;

const sorted = (events: HoldingEvent[]) =>
  [...events].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));

const contribution = (e: HoldingEvent) =>
  e.type === 'deposit' || e.type === 'buy' ? e.amountEur : e.type === 'withdrawal' || e.type === 'sell' ? -e.amountEur : 0;

/** Recorre día a día desde el primer evento hasta hoy, aplicando los eventos de cada día con `apply`. */
function walk(events: HoldingEvent[], today: string, apply: (e: HoldingEvent) => void, value: (date: string) => number): PositionPoint[] {
  const evs = sorted(events);
  if (evs.length === 0 || evs[0].date > today) return [];
  const out: PositionPoint[] = [];
  let contributed = 0;
  let i = 0;
  for (let d = evs[0].date; d <= today; d = addDays(d, 1)) {
    while (i < evs.length && evs[i].date === d) {
      contributed += contribution(evs[i]);
      apply(evs[i]);
      i++;
    }
    out.push({ date: d, value: r2(value(d)), contributed: r2(contributed) });
  }
  return out;
}

/**
 * Valor diario de una posición con precio: participaciones de ese día × último cierre conocido. Sin cierres
 * (el historial falló), el valor es lo aportado, para que el gráfico siga enseñando las compras.
 */
export function positionSeries(events: HoldingEvent[], closes: Closes | null, today: string): PositionPoint[] {
  const has = !!closes && Object.keys(closes).length > 0;
  const dates = has ? Object.keys(closes!).sort() : [];
  let qty = 0;
  let contributed = 0;
  let j = 0;
  let last: number | null = null;
  return walk(events, today, (e) => {
    contributed += contribution(e);
    if (e.type === 'buy') qty += e.quantity ?? 0;
    else if (e.type === 'sell') qty -= e.quantity ?? 0;
  }, (d) => {
    if (!has) return contributed;
    while (j < dates.length && dates[j] <= d) last = closes![dates[j++]];
    // Antes del primer cierre conocido no hay precio: se usa lo aportado.
    return last === null ? contributed : qty * last;
  });
}

/** Fondos sin precio automático: la última valoración manda y lo que entra o sale después se suma o resta. */
export function valuationSeries(events: HoldingEvent[], today: string): PositionPoint[] {
  let value = 0;
  return walk(events, today, (e) => {
    if (e.type === 'valuation') value = e.amountEur;
    else value += contribution(e);
  }, () => value);
}

/** Recorta la serie a los últimos `days` días (null = todo). */
export function lastDays(points: PositionPoint[], days: number | null): PositionPoint[] {
  if (days === null || points.length === 0) return points;
  const from = addDays(points[points.length - 1].date, -days);
  return points.filter((p) => p.date >= from);
}
