import { describe, it, expect } from 'vitest';
import { buildSummaryInput, isOnCooldown, summaryPrompt } from './summary';
import type { AppData } from '@/lib/types';
import type { PortfolioSummary } from '@/lib/finance/holdings';

const data: AppData = {
  userId: 'u', today: '2026-10-29',
  settings: { bigExpenseThreshold: 100, timezone: 'Europe/Madrid', netWorthTarget: null },
  accounts: [], rates: [], holdings: [], events: [], recurring: [], alerts: [], prices: {}, transfers: [],
  categories: [
    { id: 'c1', name: 'Comida fuera', icon: 'utensils', kind: 'expense', isFixed: false, monthlyLimit: 150, sortOrder: 0 },
  ],
  transactions: [
    { id: 't1', date: '2026-10-03', amount: -60, merchant: 'Restaurante SECRETO', note: 'cena con Ana', categoryId: 'c1', accountId: null, source: 'manual', recurringId: null },
    { id: 't2', date: '2026-10-05', amount: 2000, merchant: 'Empresa SECRETA', note: null, categoryId: null, accountId: null, source: 'manual', recurringId: null },
    { id: 't3', date: '2026-09-10', amount: -40, merchant: null, note: null, categoryId: 'c1', accountId: null, source: 'manual', recurringId: null },
  ],
  snapshots: [{ date: '2026-09-30', netWorth: 9000, byAccount: {}, byKind: {} }],
};
const pf: PortfolioSummary = { total: 10000, profit: 0, byAccount: {}, byKind: { cash: 0, savings: 0, fund: 0, crypto: 0, stock: 0 }, items: [] };

describe('buildSummaryInput', () => {
  it('agrega por categoría sin incluir comercios ni notas', () => {
    const input = buildSummaryInput(data, '2026-10', pf);
    expect(input).toMatchObject({
      month: '2026-10', income: 2000, spent: 60, saved: 1940, invested: 0,
      netWorth: 10000, netWorthChangeVsPrevMonth: 1000,
    });
    expect(input.byCategory).toEqual([{ name: 'Comida fuera', spent: 60, limit: 150, prevMonthSpent: 40 }]);
    const prompt = summaryPrompt(input);
    expect(prompt).not.toMatch(/SECRET|Ana/);
  });
  it('para un mes pasado usa la foto del cierre ', () => {
    const input = buildSummaryInput(data, '2026-09', pf);
    expect(input.netWorth).toBe(9000);
    expect(input.spent).toBe(40);
  });
});

describe('buildSummaryInput: casos límite', () => {
  it('usa Sin categoría y Otra como nombres de reserva', () => {
    const d: AppData = {
      ...data,
      transactions: [
        { id: 'a', date: '2026-10-03', amount: -10, merchant: null, note: null, categoryId: null, accountId: null, source: 'manual', recurringId: null },
        { id: 'b', date: '2026-10-04', amount: -5, merchant: null, note: null, categoryId: 'borrada', accountId: null, source: 'manual', recurringId: null },
      ],
    };
    const names = buildSummaryInput(d, '2026-10', pf).byCategory.map((c) => c.name).sort();
    expect(names).toEqual(['Otra', 'Sin categoría']);
  });
  it('netWorthChangeVsPrevMonth es null sin foto previa', () => {
    expect(buildSummaryInput({ ...data, snapshots: [] }, '2026-10', pf).netWorthChangeVsPrevMonth).toBeNull();
  });
});

describe('isOnCooldown', () => {
  const now = Date.parse('2026-10-29T12:00:00Z');
  it('sin resumen previo no hay espera', () => expect(isOnCooldown(null, now)).toBe(false));
  it('hace 30 s está en espera', () => expect(isOnCooldown('2026-10-29T11:59:30Z', now)).toBe(true));
  it('hace 60 s o más ya no', () => {
    expect(isOnCooldown('2026-10-29T11:59:00Z', now)).toBe(false);
    expect(isOnCooldown('2026-10-29T11:00:00Z', now)).toBe(false);
  });
});
