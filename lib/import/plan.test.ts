import { describe, it, expect } from 'vitest';
import { assetKey, holdingAssetKey, planImport } from './plan';
import type { TradeRepublicImport } from './trade-republic';

const BTC = { symbol: 'BTC', isin: null, name: 'Bitcoin', crypto: true };
const GOOG = { symbol: 'US02079K3059', isin: 'US02079K3059', name: 'Alphabet (A)', crypto: false };

const parsed: TradeRepublicImport = {
  transactions: [
    { ref: 'tr:1', date: '2026-10-25', amount: -21.78, merchant: 'ANTHROPIC* CLAUDE SUB', category: 'Suscripciones' },
    { ref: 'tr:2', date: '2026-10-26', amount: -21.78, merchant: 'ANTHROPIC* CLAUDE SUB', category: 'Suscripciones' },
    { ref: 'tr:3', date: '2026-10-08', amount: -12.4, merchant: 'ALDI', category: 'Supermercado' },
    { ref: 'tr:4', date: '2026-10-09', amount: -2.35, merchant: 'DULCES ISA', category: 'Merienda' },
  ],
  trades: [
    { ref: 'tr:b1', date: '2026-07-03', type: 'buy', amountEur: 26, quantity: 0.08, asset: GOOG },
    { ref: 'tr:b2', date: '2026-07-04', type: 'buy', amountEur: 0, quantity: 0.001, asset: BTC },
    { ref: 'tr:b3', date: '2026-08-03', type: 'buy', amountEur: 50, quantity: 0.0009, asset: BTC },
  ],
  counterparties: [],
  skipped: { old: 0, ownTransfers: 0, unknown: 0 },
};

describe('planImport', () => {
  const plan = planImport(parsed, {
    categories: [{ id: 'sup', name: 'Supermercado' }, { id: 'sus', name: 'suscripciones' }],
    holdings: [{ kind: 'crypto', coingeckoId: 'bitcoin', isin: null, archived: false }],
    recurringTxs: [{ date: '2026-10-25', amount: -21.78 }],
  });

  it('un cargo ya apuntado por un fijo se omite una sola vez', () => {
    expect(plan.skippedRecurring).toBe(1);
    expect(plan.transactions.map((t) => t.ref)).toEqual(['tr:2', 'tr:3', 'tr:4']);
  });

  it('busca la categoría por nombre sin distinguir mayúsculas; si no existe queda sin categoría', () => {
    expect(plan.transactions.map((t) => t.categoryId)).toEqual(['sus', 'sup', null]);
  });

  it('la categoría aprendida del comercio manda sobre la del extracto', () => {
    const learnedPlan = planImport(parsed, {
      categories: [{ id: 'sup', name: 'Supermercado' }], holdings: [], recurringTxs: [],
      learned: { aldi: 'merienda-id' },
    });
    expect(learnedPlan.transactions.find((t) => t.ref === 'tr:3')?.categoryId).toBe('merienda-id');
  });

  it('reutiliza las posiciones que ya existen y crea una por cada valor nuevo', () => {
    expect(plan.newAssets).toEqual([GOOG]);
    expect(plan.trades.map((t) => t.assetKey)).toEqual(['isin:US02079K3059', 'cg:bitcoin', 'cg:bitcoin']);
  });
});

describe('planImport con planes de inversión', () => {
  it('una compra real sustituye a la del plan del mismo valor (±3 días, ±1,50 €), una sola vez', () => {
    const plan = planImport(parsed, {
      categories: [], holdings: [{ kind: 'crypto', coingeckoId: 'bitcoin', isin: null, archived: false }], recurringTxs: [],
      planEvents: [{ id: 'ev1', assetKey: 'cg:bitcoin', date: '2026-08-02', amountEur: 50 }],
    });
    expect(plan.trades.map((t) => t.replaceEventId ?? null)).toEqual([null, null, 'ev1']);
  });
});

describe('assetKey', () => {
  it('casa cripto por id de CoinGecko y el resto por ISIN', () => {
    expect(assetKey(BTC)).toBe(holdingAssetKey({ kind: 'crypto', coingeckoId: 'bitcoin', isin: null }));
    expect(assetKey(GOOG)).toBe(holdingAssetKey({ kind: 'stock', coingeckoId: null, isin: 'US02079K3059' }));
    expect(holdingAssetKey({ kind: 'cash', coingeckoId: null, isin: null })).toBeNull();
  });
});
