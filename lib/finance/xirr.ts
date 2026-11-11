import type { HoldingEvent } from '@/lib/types';
import { daysBetween } from '@/lib/dates';

/** Dinero que sale de tu bolsillo (−) o vuelve a él (+) en una fecha. */
export interface Flow { date: string; amount: number }

/**
 * Flujos de una posición vistos desde tu bolsillo: comprar o aportar es −, vender o retirar es +, y al final,
 * el valor de hoy como si lo vendieras (+).
 */
export function positionFlows(events: HoldingEvent[], value: number, today: string): Flow[] {
  const flows: Flow[] = [];
  for (const e of events) {
    if (e.amountEur <= 0) continue;
    if (e.type === 'buy' || e.type === 'deposit') flows.push({ date: e.date, amount: -e.amountEur });
    else if (e.type === 'sell' || e.type === 'withdrawal') flows.push({ date: e.date, amount: e.amountEur });
  }
  flows.sort((a, b) => a.date.localeCompare(b.date));
  if (value > 0) flows.push({ date: today, amount: value });
  return flows;
}

function npv(flows: Flow[], rate: number): number {
  const t0 = flows[0].date;
  return flows.reduce((s, f) => s + f.amount / Math.pow(1 + rate, daysBetween(t0, f.date) / 365), 0);
}

/**
 * Rentabilidad anual que tiene en cuenta cuándo entró cada euro (TIR de los flujos). null si no se puede
 * calcular: hace falta al menos un flujo de cada signo.
 */
export function xirr(flows: Flow[]): number | null {
  if (flows.length < 2 || !flows.some((f) => f.amount < 0) || !flows.some((f) => f.amount > 0)) return null;
  const sorted = [...flows].sort((a, b) => a.date.localeCompare(b.date));
  // Bisección: el VAN baja al subir la tasa cuando primero se pone dinero y luego se recupera.
  let lo = -0.99;
  let hi = 10;
  let fLo = npv(sorted, lo);
  if (fLo * npv(sorted, hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(sorted, mid);
    if (Math.abs(fMid) < 1e-7 || hi - lo < 1e-9) return mid;
    if (fLo * fMid < 0) hi = mid;
    else { lo = mid; fLo = fMid; }
  }
  return (lo + hi) / 2;
}

/** Días desde el primer flujo: por debajo de 90, la rentabilidad anual engaña. */
export function flowAgeDays(flows: Flow[], today: string): number {
  return flows.length ? daysBetween(flows[0].date, today) : 0;
}
