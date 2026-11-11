import { describe, it, expect } from 'vitest';
import { yearSummary } from './year';
import type { Snapshot, Transaction } from '@/lib/types';

let seq = 0;
const tx = (date: string, amount: number, merchant: string | null = null, categoryId: string | null = 'super'): Transaction => ({
  id: `t${++seq}`, date, amount, merchant, note: null, categoryId, accountId: null, source: 'manual', recurringId: null,
});
const snap = (date: string, netWorth: number): Snapshot => ({ date, netWorth, byAccount: {}, byKind: {} });

describe('yearSummary', () => {
  const txs = [
    tx('2025-12-30', -999, 'Otro año'),
    tx('2026-01-05', 2000, null, null), tx('2026-01-10', -300, 'MERCADONA 12'), tx('2026-01-20', -100, 'Zara', 'ropa'),
    tx('2026-02-05', 2000, null, null), tx('2026-02-10', -900, 'Mercadona'),
  ];
  const r = yearSummary(txs, [snap('2025-12-31', 10000), snap('2026-06-30', 12000), snap('2026-11-03', 13500)], 2026);

  it('totales solo del año y tasa de ahorro', () => {
    expect(r).toMatchObject({ income: 4000, spent: 1300, saved: 2700 });
    expect(r.savingRate).toBeCloseTo(0.675);
    expect(r.months).toHaveLength(12);
  });
  it('categorías, comercio estrella (normalizado), mejor y peor mes', () => {
    expect(r.byCategory).toEqual([{ categoryId: 'super', spent: 1200 }, { categoryId: 'ropa', spent: 100 }]);
    expect(r.topMerchant).toEqual({ name: 'MERCADONA 12', spent: 1200, count: 2 });
    expect(r.bestMonth).toEqual({ month: '2026-01', saved: 1600 });
    expect(r.worstMonth).toEqual({ month: '2026-02', spent: 900 });
  });
  it('patrimonio del cierre anterior a la última foto del año', () => {
    expect(r.netWorthStart).toBe(10000);
    expect(r.netWorthEnd).toBe(13500);
  });
  it('un año vacío no inventa nada', () => {
    const e = yearSummary([], [], 2024);
    expect(e).toMatchObject({ income: 0, spent: 0, savingRate: null, topMerchant: null, bestMonth: null, netWorthStart: null });
  });
});
