import { describe, it, expect } from 'vitest';
import { accountInterests, interestBetween, interestDue, rateOn } from './interest';
import type { AccountRate, Holding, HoldingEvent, Transaction } from '@/lib/types';

const rate = (p: Partial<AccountRate>): AccountRate => ({ id: 'x', accountId: 'tr', rate: 0.02, fromDate: '2026-01-01', ...p });
const cash: Holding = { id: 'c', accountId: 'tr', name: 'Efectivo TR', kind: 'cash', apy: null, coingeckoId: null, isin: null, priceSymbol: null, archived: false };
const adjust = (date: string, amount: number): HoldingEvent => ({ id: `e${date}`, holdingId: 'c', date, type: 'balance_adjust', amountEur: amount, quantity: null, unitPriceEur: null });
const tx = (p: Partial<Transaction>): Transaction => ({
  id: 't', date: '2026-10-15', amount: 100, merchant: null, note: null, categoryId: null, accountId: 'tr', source: 'manual', recurringId: null, ...p,
});
const daily = (r: number) => Math.pow(1 + r, 1 / 365) - 1;

describe('rateOn', () => {
  it('usa la última TAE que ya había empezado', () => {
    const rates = [rate({ rate: 0.0225, fromDate: '2026-01-01' }), rate({ rate: 0.02, fromDate: '2026-12-01' })];
    expect(rateOn(rates, '2025-12-31')).toBe(0);
    expect(rateOn(rates, '2026-11-30')).toBe(0.0225);
    expect(rateOn(rates, '2026-12-01')).toBe(0.02);
  });
});

describe('interestBetween', () => {
  it('cambia de TAE a mitad de periodo sin reescribir los días anteriores', () => {
    const rates = [rate({ rate: 0.03, fromDate: '2026-01-01' }), rate({ rate: 0.01, fromDate: '2026-11-03' })];
    const got = interestBetween(() => 10_000, rates, '2026-11-01', '2026-11-04');
    expect(got).toBeCloseTo(Math.round((2 * 10_000 * daily(0.03) + 2 * 10_000 * daily(0.01)) * 100) / 100, 2);
  });
  it('no paga por saldo negativo', () => {
    expect(interestBetween(() => -500, [rate({})], '2026-11-01', '2026-11-30')).toBe(0);
  });
});

describe('interestDue', () => {
  const base = { holdings: [cash], events: [adjust('2026-09-01', 3650)], transfers: [], rates: [rate({ rate: 0.0365 })] };

  it('el día 1 paga el mes anterior según el saldo de cada día', () => {
    const due = interestDue({ ...base, transactions: [], today: '2026-11-01' });
    expect(due).toEqual([{ accountId: 'tr', date: '2026-11-01', amount: Math.round(31 * 3650 * daily(0.0365) * 100) / 100 }]);
  });
  it('tiene en cuenta los movimientos de la cuenta', () => {
    const withTx = interestDue({ ...base, transactions: [tx({ date: '2026-10-16', amount: -3650 })], today: '2026-11-01' });
    expect(withTx[0].amount).toBeCloseTo(Math.round(15 * 3650 * daily(0.0365) * 100) / 100, 2);
  });
  it('no repite si ya está apuntado y no paga después del día 3', () => {
    expect(interestDue({ ...base, transactions: [tx({ source: 'interest', date: '2026-11-01', amount: 10 })], today: '2026-11-02' })).toEqual([]);
    expect(interestDue({ ...base, transactions: [], today: '2026-11-04' })).toEqual([]);
  });
  it('sin efectivo en la cuenta no hay intereses', () => {
    expect(interestDue({ ...base, holdings: [], transactions: [], today: '2026-11-01' })).toEqual([]);
  });
});

describe('accountInterests', () => {
  it('TAE de hoy, lo que lleva el mes y lo cobrado en el año', () => {
    const r = accountInterests({
      holdings: [cash], events: [adjust('2026-09-01', 3650)], transfers: [], rates: [rate({ rate: 0.0365 })],
      transactions: [tx({ source: 'interest', date: '2026-10-01', amount: 9.5 }), tx({ source: 'interest', date: '2025-12-01', amount: 5 })],
      today: '2026-11-05',
    });
    expect(r).toHaveLength(1);
    expect(r[0].rate).toBe(0.0365);
    expect(r[0].paidThisYear).toBe(9.5);
    expect(r[0].accrued).toBeCloseTo(Math.round(4 * 3600 * daily(0.0365) * 100) / 100, 0);
  });
});
