import { describe, it, expect } from 'vitest';
import type { AppData, Recurring, Transaction } from '@/lib/types';
import type { PortfolioSummary } from '@/lib/finance/holdings';
import { checkupScore } from './checkup';

const tx = (id: string, date: string, amount: number, categoryId: string | null = 'c1'): Transaction =>
  ({ id, date, amount, merchant: null, note: null, categoryId, accountId: null, source: 'manual', recurringId: null });
const base = (extra: Partial<AppData>): AppData => ({
  userId: 'u', today: '2026-11-10',
  settings: { bigExpenseThreshold: 100, timezone: 'Europe/Madrid', netWorthTarget: null },
  accounts: [], rates: [], holdings: [], events: [], recurring: [], alerts: [], prices: {}, transfers: [], snapshots: [],
  categories: [{ id: 'c1', name: 'Ocio', icon: 'x', kind: 'expense', isFixed: false, monthlyLimit: 300, sortOrder: 0 }],
  transactions: [],
  ...extra,
});
const pf = (byKind: Partial<PortfolioSummary['byKind']>): PortfolioSummary => {
  const all = { cash: 0, savings: 0, fund: 0, crypto: 0, stock: 0, ...byKind };
  return { total: Object.values(all).reduce((s, n) => s + n, 0), profit: 0, byAccount: {}, byKind: all, items: [] };
};
const part = (s: ReturnType<typeof checkupScore>, key: string) => s.parts.find((p) => p.key === key);

describe('checkupScore', () => {
  it('mes cerrado: ahorro, presupuesto, colchón y riesgo', () => {
    const data = base({ transactions: [tx('a', '2026-10-01', 2000, null), tx('b', '2026-10-05', -1700)] });
    const s = checkupScore(data, pf({ cash: 5100, fund: 800, crypto: 200 }), '2026-10');
    expect(s.partial).toBe(false);
    expect(part(s, 'saving')).toMatchObject({ score: 5, detail: 'Has ahorrado el 15 % de lo que ingresas' }); // 15 % de 30 %
    expect(part(s, 'budget')?.score).toBe(0); // 1700 de 300: muy por encima
    expect(part(s, 'cushion')).toMatchObject({ score: 5, detail: 'Tu efectivo cubre 3 meses de gastos' });
    expect(part(s, 'risk')?.score).toBe(8); // 20 % en cripto
    expect(s.score).toBe(4.2); // 5·0,35 + 0·0,25 + 5·0,25 + 8·0,15
  });

  it('mes en curso: proyecta el gasto y cuenta la nómina que aún no ha llegado', () => {
    const salary = { id: 'r', name: 'Nómina', amount: 1300, categoryId: null, accountId: null, dayOfMonth: 28, active: true, transferAccountId: null, holdingId: null } as Recurring;
    const data = base({ recurring: [salary], transactions: [tx('a', '2026-11-03', -50)] });
    const s = checkupScore(data, pf({ cash: 6000, fund: 4500, crypto: 400 }), '2026-11');
    expect(s.partial).toBe(true);
    expect(part(s, 'saving')).toMatchObject({ score: 10, detail: 'Vas camino de ahorrar el 88 % de lo que ingresas' }); // 150 de 1300
    expect(part(s, 'budget')?.score).toBe(10);
    expect(part(s, 'budget')?.detail.replace(/\s/g, ' ')).toBe('Vas camino de cerrar en 150 € de 300 €');
    expect(part(s, 'cushion')?.detail).toBe('Tu efectivo cubre más de 24 meses de gastos');
    expect(s.score).toBe(10);
  });

  it('lo que no se puede medir no cuenta; sin nada, sin nota', () => {
    const noLimit = base({ categories: [], transactions: [tx('a', '2026-10-01', 1000, null), tx('b', '2026-10-02', -900, null)] });
    const s = checkupScore(noLimit, pf({ cash: 0 }), '2026-10');
    expect(s.parts.map((p) => p.key)).toEqual(['saving', 'cushion']);
    expect(checkupScore(base({}), pf({}), '2026-10')).toMatchObject({ score: null, parts: [] });
  });

  it('gastar más de lo que entra da un cero en ahorro', () => {
    const data = base({ transactions: [tx('a', '2026-10-01', 1000, null), tx('b', '2026-10-02', -1200)] });
    expect(part(checkupScore(data, pf({}), '2026-10'), 'saving')).toMatchObject({ score: 0, detail: 'Has gastado más de lo que ingresas' });
  });
});
