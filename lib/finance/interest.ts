import type { AccountRate, AppData } from '@/lib/types';
import { addDays, addMonths, daysInMonth, monthOf } from '@/lib/dates';
import { accountFlows, cashBalance, r2 } from './holdings';

/** TAE vigente en `date`: la última que empezó ese día o antes; 0 si aún no había. */
export function rateOn(rates: Pick<AccountRate, 'rate' | 'fromDate'>[], date: string): number {
  let best: { rate: number; fromDate: string } | null = null;
  for (const r of rates) if (r.fromDate <= date && (!best || r.fromDate > best.fromDate)) best = r;
  return best?.rate ?? 0;
}

/** Interés de los días `from`..`to` (ambos incluidos) sobre el saldo de cada día, con la TAE de cada día. */
export function interestBetween(balanceOn: (date: string) => number, rates: Pick<AccountRate, 'rate' | 'fromDate'>[], from: string, to: string): number {
  let total = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const rate = rateOn(rates, d);
    const balance = balanceOn(d);
    if (rate > 0 && balance > 0) total += balance * (Math.pow(1 + rate, 1 / 365) - 1);
  }
  return r2(total);
}

/** Saldo del efectivo de una cuenta al final de cada día, con sus gastos, ingresos, traspasos y compras. */
export function cashBalanceOf(
  data: Pick<AppData, 'holdings' | 'events' | 'transactions' | 'transfers'>, accountId: string,
): ((date: string) => number) | null {
  const cash = data.holdings.find((h) => h.accountId === accountId && h.kind === 'cash' && !h.archived);
  if (!cash) return null;
  const events = data.events.filter((e) => e.holdingId === cash.id);
  const flows = accountFlows(data.transactions, data.transfers, data.events, data.holdings).filter((f) => f.accountId === accountId);
  return (date) => cashBalance(events.filter((e) => e.date <= date), flows.filter((f) => f.date <= date));
}

export interface AccountInterest {
  accountId: string;
  rate: number; // TAE de hoy
  accrued: number; // lo que lleva generado este mes, sin pagar
  paidThisYear: number; // intereses ya apuntados este año
}

/** Cuentas con TAE (actual o pasada): TAE de hoy, lo que llevan este mes y lo cobrado en el año. */
export function accountInterests(data: Pick<AppData, 'holdings' | 'events' | 'transactions' | 'transfers' | 'rates' | 'today'>): AccountInterest[] {
  const year = data.today.slice(0, 4);
  const ids = [...new Set(data.rates.map((r) => r.accountId))];
  return ids.map((accountId) => {
    const rates = data.rates.filter((r) => r.accountId === accountId);
    const balanceOn = cashBalanceOf(data, accountId);
    const start = `${monthOf(data.today)}-01`;
    const yesterday = addDays(data.today, -1);
    return {
      accountId,
      rate: rateOn(rates, data.today),
      accrued: balanceOn && yesterday >= start ? interestBetween(balanceOn, rates, start, yesterday) : 0,
      paidThisYear: r2(data.transactions
        .filter((t) => t.source === 'interest' && t.accountId === accountId && t.date.startsWith(year))
        .reduce((s, t) => s + t.amount, 0)),
    };
  }).filter((a) => a.rate > 0 || a.paidThisYear > 0);
}

/** Intereses a pagar el día 1 de este mes por el mes anterior, por cuenta. Solo los días 1 a 3 (recupera un cron perdido). */
export function interestDue(
  data: Pick<AppData, 'holdings' | 'events' | 'transactions' | 'transfers' | 'rates' | 'today'>,
): { accountId: string; date: string; amount: number }[] {
  if (Number(data.today.slice(8, 10)) > 3) return [];
  const date = `${monthOf(data.today)}-01`;
  const prev = addMonths(monthOf(data.today), -1);
  const from = `${prev}-01`;
  const to = `${prev}-${String(daysInMonth(prev)).padStart(2, '0')}`;
  const ids = [...new Set(data.rates.map((r) => r.accountId))];
  const out: { accountId: string; date: string; amount: number }[] = [];
  for (const accountId of ids) {
    if (data.transactions.some((t) => t.source === 'interest' && t.accountId === accountId && t.date === date)) continue;
    const balanceOn = cashBalanceOf(data, accountId);
    if (!balanceOn) continue;
    const amount = interestBetween(balanceOn, data.rates.filter((r) => r.accountId === accountId), from, to);
    if (amount >= 0.01) out.push({ accountId, date, amount });
  }
  return out;
}
