import { describe, it, expect } from 'vitest';
import { buildSuggestions, type SuggestionInput } from './suggestions';
import type { Category, Holding, Transaction } from '@/lib/types';
import type { PortfolioSummary } from '@/lib/finance/holdings';

let seq = 0;
const tx = (p: Partial<Transaction> & Pick<Transaction, 'date' | 'amount'>): Transaction => ({
  id: `t${++seq}`, merchant: null, note: null, categoryId: 'ocio', accountId: null, source: 'manual', recurringId: null, ...p,
});
const ocio: Category = { id: 'ocio', name: 'Ocio', icon: 'circle', kind: 'expense', isFixed: false, monthlyLimit: null, sortOrder: 0 };
const holding = (p: Partial<Holding>): Holding => ({
  id: 'h', accountId: 'a', name: 'X', kind: 'cash', apy: null, coingeckoId: null, isin: null, priceSymbol: null, archived: false, ...p,
});
const emptyPortfolio: PortfolioSummary = { total: 0, profit: 0, byAccount: {}, byKind: { cash: 0, savings: 0, fund: 0, crypto: 0, stock: 0 }, items: [] };
const base = (p: Partial<SuggestionInput>): SuggestionInput => ({
  today: '2026-10-20', categories: [ocio], transactions: [], recurring: [], portfolio: emptyPortfolio, ...p,
});
const ids = (s: ReturnType<typeof buildSuggestions>) => s.map((x) => x.id);

describe('buildSuggestions', () => {
  it('categoría +25% respecto al mes anterior', () => {
    const transactions = [tx({ date: '2026-09-10', amount: -100 }), tx({ date: '2026-10-10', amount: -130 })];
    expect(ids(buildSuggestions(base({ transactions })))).toContain('increase:ocio');
  });
  it('no sugiere subidas pequeñas (< 20 €)', () => {
    const transactions = [tx({ date: '2026-09-10', amount: -10 }), tx({ date: '2026-10-10', amount: -20 })];
    expect(ids(buildSuggestions(base({ transactions })))).not.toContain('increase:ocio');
  });
  it('efectivo parado > 1.000 € con una remunerada disponible', () => {
    const portfolio: PortfolioSummary = {
      ...emptyPortfolio,
      byKind: { cash: 2400, savings: 500, fund: 0, crypto: 0, stock: 0 },
      items: [
        { holding: holding({ id: 'c', kind: 'cash' }), value: { value: 2400, contributed: 2400, profit: 0, profitPct: null, quantity: null, stale: false } },
        { holding: holding({ id: 's', kind: 'savings', apy: 0.0225, name: 'Remunerada TR' }), value: { value: 500, contributed: 500, profit: 0, profitPct: 0, quantity: null, stale: false } },
      ],
    };
    const s = buildSuggestions(base({ portfolio }));
    const idle = s.find((x) => x.id === 'idle-cash');
    expect(idle?.body.replace(/ /g, ' ')).toContain('54,00 €');
  });
  it('límite superado 3 meses seguidos → proponer subirlo', () => {
    const cat = { ...ocio, monthlyLimit: 100 };
    const transactions = ['2026-07-10', '2026-08-10', '2026-09-10'].map((date) => tx({ date, amount: -150 }));
    expect(ids(buildSuggestions(base({ categories: [cat], transactions })))).toContain('raise-limit:ocio');
  });
  it('recurrente cuyo importe ha cambiado', () => {
    const recurring = [{ id: 'r', name: 'Netflix', amount: -15, categoryId: null, accountId: null, dayOfMonth: 3, active: true }];
    const transactions = [
      tx({ date: '2026-09-03', amount: -13, recurringId: 'r' }),
      tx({ date: '2026-10-03', amount: -15, recurringId: 'r' }),
    ];
    expect(ids(buildSuggestions(base({ recurring, transactions })))).toContain('recurring-changed:r');
  });
});
