import { describe, it, expect } from 'vitest';
import {
  netContributed, cashBalance, accountFlows, savingsBalance, fundValue, cryptoQuantity, valueHolding, portfolio,
} from './holdings';
import type { Holding, HoldingEvent, Price } from '@/lib/types';

let seq = 0;
const ev = (p: Partial<HoldingEvent> & Pick<HoldingEvent, 'type' | 'date'>): HoldingEvent => ({
  id: String(++seq), holdingId: 'h', amountEur: 0, quantity: null, unitPriceEur: null, ...p,
});
const holding = (p: Partial<Holding>): Holding => ({
  id: 'h', accountId: 'a', name: 'X', kind: 'cash', apy: null, coingeckoId: null, isin: null, priceSymbol: null, archived: false, ...p,
});
const btc: Record<string, Price> = {
  bitcoin: { coingeckoId: 'bitcoin', priceEur: 50000, change24h: 1, updatedAt: '2026-10-29T10:00:00Z' },
};

describe('netContributed', () => {
  it('suma aportaciones y compras, resta retiradas y ventas, ignora valoraciones y ajustes', () => {
    expect(netContributed([
      ev({ type: 'deposit', date: '2026-01-01', amountEur: 1000 }),
      ev({ type: 'buy', date: '2026-01-02', amountEur: 200 }),
      ev({ type: 'withdrawal', date: '2026-01-03', amountEur: 100 }),
      ev({ type: 'sell', date: '2026-01-04', amountEur: 50 }),
      ev({ type: 'valuation', date: '2026-01-05', amountEur: 9999 }),
      ev({ type: 'balance_adjust', date: '2026-01-06', amountEur: 7777 }),
    ])).toBe(1050);
  });
});

describe('cashBalance', () => {
  it('parte del último ajuste y aplica los movimientos posteriores, en orden de fecha', () => {
    expect(cashBalance([
      ev({ type: 'withdrawal', date: '2026-01-03', amountEur: 50 }),
      ev({ type: 'balance_adjust', date: '2026-01-01', amountEur: 500 }),
      ev({ type: 'deposit', date: '2026-01-02', amountEur: 100 }),
    ])).toBe(550);
  });
});

describe('savingsBalance', () => {
  it('capitaliza a diario con el TAE', () => {
    expect(savingsBalance([ev({ type: 'deposit', date: '2025-01-01', amountEur: 10000 })], 0.02, '2026-01-01')).toBe(10200);
  });
  it('un ajuste de saldo reinicia la base', () => {
    expect(savingsBalance([
      ev({ type: 'deposit', date: '2025-01-01', amountEur: 10000 }),
      ev({ type: 'balance_adjust', date: '2025-07-01', amountEur: 10100 }),
    ], 0.02, '2025-07-01')).toBe(10100);
  });
  it('sin eventos vale 0', () => {
    expect(savingsBalance([], 0.02, '2026-01-01')).toBe(0);
  });
});

describe('fundValue', () => {
  it('sin valoraciones vale lo aportado', () => {
    expect(fundValue([ev({ type: 'deposit', date: '2026-01-01', amountEur: 1000 })])).toBe(1000);
  });
  it('última valoración + flujos posteriores (los del mismo día ya están incluidos)', () => {
    expect(fundValue([
      ev({ type: 'deposit', date: '2026-01-01', amountEur: 1000 }),
      ev({ type: 'deposit', date: '2026-02-01', amountEur: 500 }),
      ev({ type: 'valuation', date: '2026-02-01', amountEur: 1600 }),
      ev({ type: 'deposit', date: '2026-02-15', amountEur: 200 }),
      ev({ type: 'withdrawal', date: '2026-02-20', amountEur: 100 }),
    ])).toBe(1700);
  });
});

describe('cryptoQuantity', () => {
  it('compras menos ventas', () => {
    expect(cryptoQuantity([
      ev({ type: 'buy', date: '2026-01-01', quantity: 0.5 }),
      ev({ type: 'buy', date: '2026-01-02', quantity: 0.25 }),
      ev({ type: 'sell', date: '2026-01-03', quantity: 0.1 }),
    ])).toBeCloseTo(0.65, 10);
  });
});

describe('valueHolding', () => {
  it('cripto con precio: valor = cantidad × precio', () => {
    const v = valueHolding(holding({ kind: 'crypto', coingeckoId: 'bitcoin' }),
      [ev({ type: 'buy', date: '2026-01-01', amountEur: 20000, quantity: 0.5 })], btc, '2026-10-29');
    expect(v).toEqual({ value: 25000, contributed: 20000, profit: 5000, profitPct: 0.25, quantity: 0.5, stale: false });
  });
  it('cripto sin precio: vale lo aportado y queda marcada como stale', () => {
    const v = valueHolding(holding({ kind: 'crypto', coingeckoId: 'solana' }),
      [ev({ type: 'buy', date: '2026-01-01', amountEur: 300, quantity: 2 })], btc, '2026-10-29');
    expect(v.value).toBe(300);
    expect(v.stale).toBe(true);
  });
  it('acción con símbolo de Yahoo: cantidad × precio, entradas sin coste incluidas', () => {
    const prices = { 'yf:ABEA.DE': { coingeckoId: 'yf:ABEA.DE', priceEur: 250, change24h: null, updatedAt: '2026-11-03T10:00:00Z' } };
    const v = valueHolding(holding({ kind: 'stock', priceSymbol: 'ABEA.DE' }), [
      ev({ type: 'buy', date: '2026-07-03', amountEur: 26, quantity: 0.08 }),
      ev({ type: 'buy', date: '2026-07-04', amountEur: 0, quantity: 0.02 }),
    ], prices, '2026-11-03');
    expect(v).toMatchObject({ value: 25, contributed: 26, quantity: 0.1, stale: false });
  });
  it('fondo con símbolo se valora por participaciones; sin símbolo, por valoraciones', () => {
    const prices = { 'yf:F': { coingeckoId: 'yf:F', priceEur: 14.5, change24h: null, updatedAt: '2026-11-03T10:00:00Z' } };
    const events = [ev({ type: 'buy', date: '2026-11-03', amountEur: 4000, quantity: 300 })];
    expect(valueHolding(holding({ kind: 'fund', priceSymbol: 'F' }), events, prices, '2026-11-03').value).toBe(4350);
    expect(valueHolding(holding({ kind: 'fund' }), events, prices, '2026-11-03').value).toBe(4000);
  });
  it('efectivo: sin beneficio', () => {
    const v = valueHolding(holding({ kind: 'cash' }), [ev({ type: 'deposit', date: '2026-01-01', amountEur: 800 })], {}, '2026-10-29');
    expect(v).toMatchObject({ value: 800, contributed: 800, profit: 0, profitPct: null });
  });
  it('remunerada: beneficio = intereses', () => {
    const v = valueHolding(holding({ kind: 'savings', apy: 0.02 }),
      [ev({ type: 'deposit', date: '2025-01-01', amountEur: 10000 })], {}, '2026-01-01');
    expect(v).toMatchObject({ value: 10200, contributed: 10000, profit: 200, profitPct: 0.02 });
  });
});

describe('portfolio', () => {
  it('suma por cuenta y por tipo, sin posiciones archivadas', () => {
    const holdings = [
      holding({ id: 'c', accountId: 'ing', kind: 'cash' }),
      holding({ id: 'b', accountId: 'trust', kind: 'crypto', coingeckoId: 'bitcoin' }),
      holding({ id: 'z', accountId: 'trust', kind: 'cash', archived: true }),
    ];
    const events = [
      ev({ holdingId: 'c', type: 'deposit', date: '2026-01-01', amountEur: 1000 }),
      ev({ holdingId: 'b', type: 'buy', date: '2026-01-01', amountEur: 20000, quantity: 0.5 }),
      ev({ holdingId: 'z', type: 'deposit', date: '2026-01-01', amountEur: 999 }),
    ];
    const p = portfolio(holdings, events, btc, '2026-10-29');
    expect(p.total).toBe(26000);
    expect(p.profit).toBe(5000);
    expect(p.byAccount).toEqual({ ing: 1000, trust: 25000 });
    expect(p.byKind).toEqual({ cash: 1000, savings: 0, fund: 0, crypto: 25000, stock: 0 });
    expect(p.items).toHaveLength(2);
  });
});

describe('efectivo con flujos de la cuenta', () => {
  const adj = ev({ type: 'balance_adjust', date: '2026-11-03', amountEur: 100, createdAt: '2026-11-03T10:00:00Z' });
  it('solo cuentan los flujos posteriores al último ajuste (mismo día: creados después)', () => {
    const flows = [
      { accountId: 'a', date: '2026-11-01', amount: -50 },
      { accountId: 'a', date: '2026-11-03', createdAt: '2026-11-03T09:00:00Z', amount: -5 },
      { accountId: 'a', date: '2026-11-03', createdAt: '2026-11-03T11:00:00Z', amount: -2.5 },
      { accountId: 'a', date: '2026-11-04', amount: 30 },
    ];
    expect(cashBalance([adj], flows)).toBe(127.5);
  });

  it('accountFlows: gastos, traspasos en ambos sentidos y compras de otras posiciones de la cuenta', () => {
    const flows = accountFlows(
      [{ accountId: 'tr', date: '2026-11-04', amount: -3 }, { accountId: null, date: '2026-11-04', amount: -9 }],
      [{ fromAccountId: 'caja', toAccountId: 'tr', date: '2026-11-05', amount: 600 }],
      [ev({ holdingId: 'btc', type: 'buy', date: '2026-11-06', amountEur: 50, quantity: 0.001 }),
        ev({ holdingId: 'btc', type: 'buy', date: '2026-11-06', amountEur: 0, quantity: 0.001 }),
        ev({ holdingId: 'cash', type: 'deposit', date: '2026-11-06', amountEur: 10 })],
      [{ id: 'btc', accountId: 'tr', kind: 'crypto' }, { id: 'cash', accountId: 'tr', kind: 'cash' }],
    );
    expect(flows.map((f) => [f.accountId, f.amount])).toEqual([['tr', -3], ['caja', -600], ['tr', 600], ['tr', -50]]);
  });

  it('portfolio aplica los flujos solo al primer efectivo de cada cuenta', () => {
    const p = portfolio(
      [holding({ id: 'c1', accountId: 'tr', kind: 'cash' }), holding({ id: 'c2', accountId: 'tr', kind: 'cash' })],
      [ev({ holdingId: 'c1', type: 'balance_adjust', date: '2026-11-01', amountEur: 100 }),
        ev({ holdingId: 'c2', type: 'balance_adjust', date: '2026-11-01', amountEur: 10 })],
      {}, '2026-11-05', [{ accountId: 'tr', date: '2026-11-02', amount: -20 }],
    );
    expect(p.items.map((i) => i.value.value)).toEqual([80, 10]);
  });
});
