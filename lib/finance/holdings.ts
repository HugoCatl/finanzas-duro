import type { Holding, HoldingEvent, HoldingKind, Price, Transaction, Transfer } from '@/lib/types';
import { daysBetween } from '@/lib/dates';
import { priceKey } from '@/lib/prices/keys';

export const r2 = (n: number) => Math.round(n * 100) / 100;

export interface HoldingValue {
  value: number;
  contributed: number;
  profit: number;
  profitPct: number | null;
  quantity: number | null;
  stale: boolean;
}

export interface PortfolioItem { holding: Holding; value: HoldingValue }

export interface PortfolioSummary {
  total: number;
  profit: number;
  byAccount: Record<string, number>;
  byKind: Record<HoldingKind, number>;
  items: PortfolioItem[];
}

const byDate = (events: HoldingEvent[]) =>
  [...events].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));

export function netContributed(events: HoldingEvent[]): number {
  let total = 0;
  for (const e of events) {
    if (e.type === 'deposit' || e.type === 'buy') total += e.amountEur;
    else if (e.type === 'withdrawal' || e.type === 'sell') total -= e.amountEur;
  }
  return r2(total);
}

/** Dinero que entra (+) o sale (−) del efectivo de una cuenta por algo que no es un evento del propio efectivo. */
export interface CashFlow { accountId: string; date: string; createdAt?: string; amount: number }

/** Gastos/ingresos, traspasos y compras/ventas de otras posiciones, como entradas y salidas de efectivo por cuenta. */
export function accountFlows(
  transactions: Pick<Transaction, 'accountId' | 'date' | 'createdAt' | 'amount'>[],
  transfers: Pick<Transfer, 'fromAccountId' | 'toAccountId' | 'date' | 'createdAt' | 'amount'>[],
  events: HoldingEvent[],
  holdings: Pick<Holding, 'id' | 'accountId' | 'kind'>[],
): CashFlow[] {
  const flows: CashFlow[] = [];
  for (const t of transactions) {
    if (t.accountId) flows.push({ accountId: t.accountId, date: t.date, createdAt: t.createdAt, amount: t.amount });
  }
  for (const t of transfers) {
    flows.push({ accountId: t.fromAccountId, date: t.date, createdAt: t.createdAt, amount: -t.amount });
    flows.push({ accountId: t.toAccountId, date: t.date, createdAt: t.createdAt, amount: t.amount });
  }
  const byId = new Map(holdings.map((h) => [h.id, h]));
  for (const e of events) {
    const h = byId.get(e.holdingId);
    if (!h || h.kind === 'cash' || e.amountEur <= 0 || (e.type !== 'buy' && e.type !== 'sell')) continue;
    flows.push({ accountId: h.accountId, date: e.date, createdAt: e.createdAt, amount: e.type === 'buy' ? -e.amountEur : e.amountEur });
  }
  return flows;
}

const after = (f: { date: string; createdAt?: string }, a: { date: string; createdAt?: string }) =>
  f.date > a.date || (f.date === a.date && !!f.createdAt && !!a.createdAt && f.createdAt > a.createdAt);

/**
 * Saldo del efectivo: sus eventos (el último "ajustar saldo" manda) más los flujos de la cuenta posteriores a ese
 * ajuste. Lo anterior al ajuste ya está dentro del saldo real que se apuntó, así el historial importado no descuadra.
 */
export function cashBalance(events: HoldingEvent[], flows: CashFlow[] = []): number {
  const sorted = byDate(events);
  const anchor = sorted.filter((e) => e.type === 'balance_adjust').at(-1) ?? sorted[0];
  let balance = eventsBalance(sorted);
  if (anchor) for (const f of flows) if (after(f, anchor)) balance += f.amount;
  return r2(balance);
}

function eventsBalance(events: HoldingEvent[]): number {
  let balance = 0;
  for (const e of events) {
    if (e.type === 'balance_adjust') balance = e.amountEur;
    else if (e.type === 'deposit') balance += e.amountEur;
    else if (e.type === 'withdrawal') balance -= e.amountEur;
  }
  return balance;
}

/** Saldo con interés compuesto diario según el TAE entre eventos y hasta `today`. */
export function savingsBalance(events: HoldingEvent[], apy: number, today: string): number {
  let balance = 0;
  let last: string | null = null;
  const grow = (to: string) => {
    if (last !== null && balance > 0) {
      const days = daysBetween(last, to);
      if (days > 0) balance *= Math.pow(1 + apy, days / 365);
    }
    last = to;
  };
  for (const e of byDate(events)) {
    grow(e.date);
    if (e.type === 'deposit') balance += e.amountEur;
    else if (e.type === 'withdrawal') balance -= e.amountEur;
    else if (e.type === 'balance_adjust') balance = e.amountEur;
  }
  if (last !== null) grow(today);
  return r2(balance);
}

export function fundValue(events: HoldingEvent[]): number {
  const sorted = byDate(events);
  const valuation = sorted.filter((e) => e.type === 'valuation').at(-1);
  if (!valuation) return netContributed(sorted);
  let value = valuation.amountEur;
  for (const e of sorted) {
    if (e.date <= valuation.date) continue;
    if (e.type === 'deposit' || e.type === 'buy') value += e.amountEur;
    else if (e.type === 'withdrawal' || e.type === 'sell') value -= e.amountEur;
  }
  return r2(value);
}

export function cryptoQuantity(events: HoldingEvent[]): number {
  let qty = 0;
  for (const e of events) {
    if (e.type === 'buy') qty += e.quantity ?? 0;
    else if (e.type === 'sell') qty -= e.quantity ?? 0;
  }
  return qty;
}

export function valueHolding(
  holding: Holding,
  events: HoldingEvent[],
  prices: Record<string, Price>,
  today: string,
  flows: CashFlow[] = [],
): HoldingValue {
  const contributed = netContributed(events);
  if (holding.kind === 'cash') {
    const value = cashBalance(events, flows);
    return { value, contributed: value, profit: 0, profitPct: null, quantity: null, stale: false };
  }

  const key = priceKey(holding);
  let value: number;
  let quantity: number | null = null;
  let stale = false;
  if (holding.kind === 'savings') {
    value = savingsBalance(events, holding.apy ?? 0, today);
  } else if (holding.kind === 'fund' && !key) {
    value = fundValue(events);
  } else {
    // Cripto, acciones y fondos con símbolo: participaciones × último precio.
    quantity = cryptoQuantity(events);
    const price = key ? prices[key] : undefined;
    if (price) value = r2(quantity * price.priceEur);
    else {
      value = contributed;
      stale = true;
    }
  }

  const profit = r2(value - contributed);
  return { value, contributed, profit, profitPct: contributed > 0 ? profit / contributed : null, quantity, stale };
}

export function portfolio(
  holdings: Holding[],
  events: HoldingEvent[],
  prices: Record<string, Price>,
  today: string,
  flows: CashFlow[] = [],
): PortfolioSummary {
  const byKind: Record<HoldingKind, number> = { cash: 0, savings: 0, fund: 0, crypto: 0, stock: 0 };
  const byAccount: Record<string, number> = {};
  const items: PortfolioItem[] = [];
  let total = 0;
  let profit = 0;

  // Los flujos de cada cuenta van a su primer efectivo activo.
  const cashOf = new Map<string, string>();
  for (const h of holdings) if (!h.archived && h.kind === 'cash' && !cashOf.has(h.accountId)) cashOf.set(h.accountId, h.id);

  for (const holding of holdings) {
    if (holding.archived) continue;
    const own = cashOf.get(holding.accountId) === holding.id ? flows.filter((f) => f.accountId === holding.accountId) : [];
    const value = valueHolding(holding, events.filter((e) => e.holdingId === holding.id), prices, today, own);
    items.push({ holding, value });
    total += value.value;
    profit += value.profit;
    byKind[holding.kind] = r2(byKind[holding.kind] + value.value);
    byAccount[holding.accountId] = r2((byAccount[holding.accountId] ?? 0) + value.value);
  }

  return { total: r2(total), profit: r2(profit), byAccount, byKind, items };
}
