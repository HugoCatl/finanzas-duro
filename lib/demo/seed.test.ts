import { describe, expect, it } from 'vitest';
import { seedDemo } from './seed';
import { toEvent, toHolding, toPrice, toSnapshot, toTransaction, toTransfer, isTransferRow, type Row } from '@/lib/data/mappers';
import { appPortfolio } from '@/lib/finance/app-portfolio';

describe('datos del modo demo', () => {
  it('la última foto del patrimonio cuadra con lo que calcula la app hoy', () => {
    const now = new Date('2026-11-10T10:00:00Z');
    const t = seedDemo(now);
    const today = '2026-11-10';
    const tx = (t.transactions as Row[]).filter((r) => String(r.date) >= '2025-11-01');
    const data = {
      today,
      holdings: t.holdings.map(toHolding),
      events: t.holding_events.map(toEvent),
      prices: Object.fromEntries(t.price_cache.map(toPrice).map((p) => [p.coingeckoId, p])),
      transactions: tx.filter((r) => !isTransferRow(r)).map(toTransaction),
      transfers: tx.filter(isTransferRow).map(toTransfer),
    };
    const pf = appPortfolio(data);
    const snaps = t.snapshots.map(toSnapshot);
    const monthEnd = snaps.find((s) => s.date === '2026-11-10') ?? snaps[snaps.length - 1];
    expect(Math.abs(pf.total - monthEnd.netWorth)).toBeLessThan(50);
  });
});
