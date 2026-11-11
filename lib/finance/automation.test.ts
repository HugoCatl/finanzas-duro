import { describe, it, expect } from 'vitest';
import { automationSteps } from './automation';
import type { PortfolioSummary } from './holdings';
import type { Holding, Recurring } from '@/lib/types';

const rec = (p: Partial<Recurring>): Recurring => ({
  id: 'r', name: 'x', amount: -100, categoryId: null, accountId: null, dayOfMonth: 1, active: true, ...p,
});
const holding = (p: Partial<Holding>): Holding => ({
  id: 'h', accountId: 'a', name: 'x', kind: 'cash', apy: null, coingeckoId: null, isin: null, priceSymbol: null, archived: false, ...p,
});
const pf = (cash: Record<string, number>): PortfolioSummary => ({
  total: 0, profit: 0, byAccount: {}, byKind: { cash: 0, savings: 0, fund: 0, crypto: 0, stock: 0 },
  items: Object.entries(cash).map(([accountId, value]) => ({
    holding: holding({ id: `c-${accountId}`, accountId }),
    value: { value, contributed: value, profit: 0, profitPct: null, quantity: null, stale: false },
  })),
});

const nomina = rec({ id: 'nom', name: 'Nómina', amount: 2000, accountId: 'ing', dayOfMonth: 27 });
const toMyInvestor = rec({ id: 'tr1', amount: -450, accountId: 'ing', transferAccountId: 'myi', dayOfMonth: 31 });
const plan = rec({ id: 'plan', amount: -700, holdingId: 'fondo', dayOfMonth: 5 });
const holdings = [holding({ id: 'fondo', accountId: 'myi', kind: 'fund' })];

describe('automationSteps', () => {
  it('ordena por próxima fecha y cuenta la última vez hecha', () => {
    const steps = automationSteps({
      recurring: [plan, toMyInvestor, nomina], holdings, events: [], transfers: [],
      transactions: [{ id: 't', date: '2026-10-27', amount: 2000, merchant: null, note: null, categoryId: null, accountId: 'ing', source: 'recurring', recurringId: 'nom' }],
      today: '2026-11-04',
    }, pf({ ing: 100, myi: 0 }));
    expect(steps.map((s) => [s.recurring.id, s.next])).toEqual([['plan', '2026-11-05'], ['nom', '2026-11-27'], ['tr1', '2026-11-30']]);
    expect(steps.find((s) => s.recurring.id === 'nom')!.lastDone).toBe('2026-10-27');
    expect(steps.find((s) => s.recurring.id === 'plan')!.fromAccountId).toBe('myi');
  });

  it('avisa si en la cuenta de origen no habrá saldo ese día', () => {
    const steps = automationSteps({ recurring: [plan, toMyInvestor, nomina], holdings, events: [], transfers: [], transactions: [], today: '2026-11-04' },
      pf({ ing: 100, myi: 200 }));
    expect(steps.find((s) => s.recurring.id === 'plan')!.shortfall).toBe(500); // el traspaso llega después del día 5
    expect(steps.find((s) => s.recurring.id === 'tr1')!.shortfall).toBe(0); // la nómina entra antes
  });

  it('no comprueba cuentas sin efectivo apuntado', () => {
    const steps = automationSteps({ recurring: [plan], holdings, events: [], transfers: [], transactions: [], today: '2026-11-04' }, pf({}));
    expect(steps[0].shortfall).toBe(0);
  });
});
