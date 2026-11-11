import { describe, it, expect } from 'vitest';
import type { Holding, HoldingEvent } from '@/lib/types';
import type { PortfolioItem } from './holdings';
import { benchmarkReturn, contributionFlows, inflationReturn, ownReturn, portfolioFlows, savingsReturn } from './compare';
import { investmentAdvice, looksIndexed } from './advice';
import { projectScenarios } from './projection';

let seq = 0;
const ev = (p: Partial<HoldingEvent> & Pick<HoldingEvent, 'type' | 'date'>): HoldingEvent => ({
  id: String(++seq), holdingId: 'h', amountEur: 0, quantity: null, unitPriceEur: null, ...p,
});
const holding = (p: Partial<Holding>): Holding => ({
  id: 'h', accountId: 'a', name: 'X', kind: 'fund', apy: null, coingeckoId: null, isin: null, priceSymbol: null, archived: false, ...p,
});
const item = (h: Partial<Holding>, value: number): PortfolioItem => ({
  holding: holding(h), value: { value, contributed: value, profit: 0, profitPct: 0, quantity: null, stale: false },
});

const flows = [{ date: '2025-01-01', amount: -100 }, { date: '2025-07-01', amount: -100 }];

describe('flujos', () => {
  it('solo cuenta lo que pones y sacas', () => {
    expect(contributionFlows([
      ev({ type: 'buy', date: '2025-01-02', amountEur: 50 }),
      ev({ type: 'valuation', date: '2025-01-03', amountEur: 60 }),
      ev({ type: 'sell', date: '2025-01-04', amountEur: 10 }),
    ])).toEqual([{ date: '2025-01-02', amount: -50 }, { date: '2025-01-04', amount: 10 }]);
  });

  it('la cartera junta fondos, acciones y cripto activos', () => {
    const hs = [holding({ id: 'f' }), holding({ id: 'c', kind: 'cash' }), holding({ id: 'x', archived: true })];
    const evs = [ev({ holdingId: 'f', type: 'buy', date: '2025-01-01', amountEur: 1 }), ev({ holdingId: 'c', type: 'deposit', date: '2025-01-01', amountEur: 9 }),
      ev({ holdingId: 'x', type: 'buy', date: '2025-01-01', amountEur: 9 })];
    expect(portfolioFlows(evs, hs)).toEqual([{ date: '2025-01-01', amount: -1 }]);
  });

  it('tu rentabilidad sobre lo aportado neto', () => {
    expect(ownReturn(flows, 220)).toBeCloseTo(0.1);
    expect(ownReturn([], 10)).toBeNull();
  });
});

describe('referencias', () => {
  it('índice: cada euro compra al cierre de su día', () => {
    // 100 € a 10 (10 part.) y 100 € a 20 (5 part.): 15 part. a 20 = 300 € de 200 → +50 %.
    const r = benchmarkReturn(flows, { '2025-01-01': 10, '2025-07-01': 20 });
    expect(r?.pct).toBeCloseTo(0.5);
  });

  it('índice: usa el cierre anterior si ese día no hubo mercado y null sin historial', () => {
    expect(benchmarkReturn([{ date: '2025-01-05', amount: -100 }], { '2025-01-03': 10, '2025-02-01': 11 })?.pct).toBeCloseTo(0.1);
    expect(benchmarkReturn([{ date: '2024-12-01', amount: -100 }], { '2025-01-03': 10 })).toBeNull();
    expect(benchmarkReturn(flows, null)).toBeNull();
  });

  it('cuenta al 2 %', () => {
    expect(savingsReturn([{ date: '2025-01-01', amount: -100 }], '2026-01-01')?.pct).toBeCloseTo(0.02, 4);
  });

  it('inflación con índice mensual y sin él', () => {
    const r = inflationReturn([{ date: '2025-01-15', amount: -100 }], '2026-01-01', { '2025-01': 100, '2025-12': 103 });
    expect(r).toEqual({ pct: expect.closeTo(0.03, 5) });
    const est = inflationReturn([{ date: '2025-01-01', amount: -100 }], '2026-01-01', null);
    expect(est?.estimated).toBe(true);
    expect(est?.pct).toBeCloseTo(0.025, 4);
  });
});

describe('investmentAdvice', () => {
  it('colchón corto y mucha cripto, como mucho dos', () => {
    const a = investmentAdvice({
      items: [item({ id: 'c', kind: 'cash' }, 500), item({ id: 'b', kind: 'crypto' }, 400), item({ id: 's', kind: 'stock' }, 600)],
      profiles: {}, monthlySpend: 1000,
    });
    expect(a.map((x) => x.id)).toEqual(['cushion', 'crypto']);
  });

  it('fondo no indexado grande y comisión alta', () => {
    const a = investmentAdvice({
      items: [item({ id: 'f', name: 'Fondo Gestora Activa' }, 900), item({ id: 'i', name: 'Fidelity MSCI World' }, 100)],
      profiles: { i: { ter: 0.015, indexed: true } }, monthlySpend: null,
    });
    expect(a.map((x) => x.id)).toEqual(['concentration', 'fees']);
  });

  it('cartera sana no dice nada', () => {
    expect(investmentAdvice({ items: [item({ name: 'Vanguard Global Stock Index' }, 1000)], profiles: {}, monthlySpend: null })).toEqual([]);
    expect(looksIndexed('iShares MSCI World')).toBe(true);
  });
});

describe('projectScenarios', () => {
  it('tres escenarios ordenados y lo aportado', () => {
    const s = projectScenarios(1000, 100, 10);
    expect(s).toHaveLength(11);
    expect(s[0]).toEqual({ year: 0, low: 1000, mid: 1000, high: 1000, contributed: 1000 });
    expect(s[10].contributed).toBe(13000);
    expect(s[10].low).toBeLessThan(s[10].mid);
    expect(s[10].mid).toBeLessThan(s[10].high);
  });
});
