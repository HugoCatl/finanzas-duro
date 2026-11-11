import { describe, it, expect } from 'vitest';
import { monthTotals, budgetStatus, budgetLevel, projectedSpend, spendByCategory, monthlySeries } from './month';
import type { Category, Holding, HoldingEvent, Transaction } from '@/lib/types';

let seq = 0;
const tx = (p: Partial<Transaction> & Pick<Transaction, 'date' | 'amount'>): Transaction => ({
  id: String(++seq), merchant: null, note: null, categoryId: null, accountId: null, source: 'manual', recurringId: null, ...p,
});
const cat = (p: Partial<Category> & Pick<Category, 'id'>): Category => ({
  name: p.id, icon: 'circle', kind: 'expense', isFixed: false, monthlyLimit: null, sortOrder: 0, ...p,
});
const ev = (p: Partial<HoldingEvent> & Pick<HoldingEvent, 'type' | 'date' | 'holdingId'>): HoldingEvent => ({
  id: String(++seq), amountEur: 0, quantity: null, unitPriceEur: null, ...p,
});
const h = (id: string, kind: Holding['kind']): Holding => ({
  id, accountId: 'a', name: id, kind, apy: null, coingeckoId: null, isin: null, priceSymbol: null, archived: false,
});

describe('monthTotals', () => {
  it('calcula ingresado, gastado, ahorrado e invertido del mes', () => {
    const txs = [
      tx({ date: '2026-10-01', amount: 2000 }),
      tx({ date: '2026-10-05', amount: -50 }),
      tx({ date: '2026-10-20', amount: -30 }),
      tx({ date: '2026-09-30', amount: -100 }),
    ];
    const holdings = [h('f', 'fund'), h('c', 'crypto'), h('s', 'savings')];
    const events = [
      ev({ holdingId: 'f', type: 'deposit', date: '2026-10-02', amountEur: 300 }),
      ev({ holdingId: 'c', type: 'buy', date: '2026-10-03', amountEur: 100 }),
      ev({ holdingId: 's', type: 'deposit', date: '2026-10-03', amountEur: 500 }),
      ev({ holdingId: 'f', type: 'deposit', date: '2026-09-02', amountEur: 999 }),
    ];
    expect(monthTotals(txs, events, holdings, '2026-10')).toEqual({ income: 2000, spent: 80, saved: 1920, invested: 400 });
  });
});

describe('budgetLevel', () => {
  it.each([[null, 'ok'], [0.5, 'ok'], [0.8, 'warn'], [0.99, 'warn'], [1, 'over'], [1.4, 'over']] as const)(
    '%s → %s', (pct, level) => expect(budgetLevel(pct)).toBe(level));
});

describe('budgetStatus', () => {
  it('por categoría y total: el total cuenta todo el gasto, también sin límite y sin categoría', () => {
    const categories = [
      cat({ id: 'A', monthlyLimit: 100 }),
      cat({ id: 'B', monthlyLimit: 200 }),
      cat({ id: 'C' }),
      cat({ id: 'N', kind: 'income' }),
    ];
    const txs = [
      tx({ date: '2026-10-02', amount: -85, categoryId: 'A' }),
      tx({ date: '2026-10-03', amount: -250, categoryId: 'B' }),
      tx({ date: '2026-10-04', amount: -40, categoryId: 'C' }),
      tx({ date: '2026-10-05', amount: -10 }),
      tx({ date: '2026-10-01', amount: 1000, categoryId: 'N' }),
    ];
    const s = budgetStatus(categories, txs, '2026-10');
    expect(s).toMatchObject({ limit: 300, spent: 385, remaining: -85, level: 'over', uncategorizedSpent: 10, unlimitedSpent: 40 });
    expect(s.pct).toBeCloseTo(385 / 300);
    expect(s.categories.map((c) => [c.category.id, c.spent, c.level])).toEqual([
      ['A', 85, 'warn'], ['B', 250, 'over'], ['C', 40, 'ok'],
    ]);
    expect(s.categories[2]).toMatchObject({ limit: null, remaining: null, pct: null });
  });
});

describe('budgetStatus: gasto sin límite', () => {
  it('lo gastado en una categoría sin límite también cuenta para el total', () => {
    const categories = [cat({ id: 'V' }), cat({ id: 'O', monthlyLimit: 100 })];
    const txs = [tx({ date: '2026-10-01', amount: -800, categoryId: 'V' }), tx({ date: '2026-10-02', amount: -20, categoryId: 'O' })];
    const s = budgetStatus(categories, txs, '2026-10');
    expect(s).toMatchObject({ limit: 100, spent: 820, remaining: -720, level: 'over', unlimitedSpent: 800 });
    expect(s.pct).toBeCloseTo(8.2);
  });
});

describe('projectedSpend', () => {
  it('extrapola al final del mes', () => {
    expect(projectedSpend(300, '2026-10-10')).toBe(930);
  });
});

describe('spendByCategory', () => {
  it('agrupa gastos del mes; sin categoría → "none"', () => {
    expect(spendByCategory([
      tx({ date: '2026-10-01', amount: -10, categoryId: 'A' }),
      tx({ date: '2026-10-02', amount: -5, categoryId: 'A' }),
      tx({ date: '2026-10-03', amount: -7 }),
      tx({ date: '2026-10-03', amount: 100, categoryId: 'N' }),
      tx({ date: '2026-09-03', amount: -99, categoryId: 'A' }),
    ], '2026-10')).toEqual({ A: 15, none: 7 });
  });
});

describe('monthlySeries', () => {
  it('devuelve n meses terminando en endMonth, del más antiguo al más reciente', () => {
    expect(monthlySeries([
      tx({ date: '2026-08-10', amount: 1000 }),
      tx({ date: '2026-10-01', amount: -40 }),
    ], '2026-10', 3)).toEqual([
      { month: '2026-08', income: 1000, spent: 0 },
      { month: '2026-09', income: 0, spent: 0 },
      { month: '2026-10', income: 0, spent: 40 },
    ]);
  });
});
