import { describe, expect, it } from 'vitest';
import { validateEvent, validateNewHolding } from './validate';

const base = { name: 'X', kind: 'cash' as const, apyPct: null, coingeckoId: null, priceSymbol: null, date: '2026-01-01', amountEur: 10, quantity: null };

describe('validateNewHolding', () => {
  it('acepta una posición de efectivo válida', () => expect(validateNewHolding(base)).toBeNull());
  it('rechaza nombre vacío, fecha mala, importe negativo o NaN', () => {
    expect(validateNewHolding({ ...base, name: ' ' })).not.toBeNull();
    expect(validateNewHolding({ ...base, date: '1/1/2026' })).not.toBeNull();
    expect(validateNewHolding({ ...base, amountEur: -1 })).not.toBeNull();
    expect(validateNewHolding({ ...base, amountEur: NaN })).not.toBeNull();
  });
  it('cripto exige id y cantidad finita > 0', () => {
    const c = { ...base, kind: 'crypto' as const, coingeckoId: 'bitcoin', quantity: 0.01 };
    expect(validateNewHolding(c)).toBeNull();
    expect(validateNewHolding({ ...c, quantity: NaN })).not.toBeNull();
    expect(validateNewHolding({ ...c, coingeckoId: ' ' })).not.toBeNull();
  });
  it('acción y fondo con símbolo exigen participaciones y un código válido', () => {
    const s = { ...base, kind: 'stock' as const, priceSymbol: 'ABEA.DE', quantity: 0.08 };
    expect(validateNewHolding(s)).toBeNull();
    expect(validateNewHolding({ ...s, quantity: null })).not.toBeNull();
    expect(validateNewHolding({ ...s, priceSymbol: 'ABEA DE; drop' })).not.toBeNull();
    expect(validateNewHolding({ ...base, kind: 'fund', priceSymbol: '0P0001CLDK.F', quantity: null })).not.toBeNull();
    expect(validateNewHolding({ ...base, kind: 'fund' })).toBeNull();
  });
  it('rechaza TAE no válido', () => {
    expect(validateNewHolding({ ...base, kind: 'savings', apyPct: NaN })).not.toBeNull();
    expect(validateNewHolding({ ...base, kind: 'savings', apyPct: 2.25 })).toBeNull();
  });
});

describe('validateEvent', () => {
  const ev = { type: 'deposit' as const, date: '2026-01-01', amountEur: 5, quantity: null };
  it('acepta movimientos coherentes con el tipo de posición', () => {
    expect(validateEvent('cash', null, ev)).toBeNull();
    expect(validateEvent('crypto', null, { ...ev, type: 'buy', quantity: 1 })).toBeNull();
    expect(validateEvent('stock', null, { ...ev, type: 'buy', quantity: 1 })).toBeNull();
  });
  it('un fondo con símbolo se mueve con compras y ventas, no con aportaciones', () => {
    expect(validateEvent('fund', 'F', { ...ev, type: 'buy', quantity: 2 })).toBeNull();
    expect(validateEvent('fund', 'F', ev)).not.toBeNull();
    expect(validateEvent('fund', null, ev)).toBeNull();
  });
  it('rechaza tipos incoherentes y cantidades inválidas', () => {
    expect(validateEvent('cash', null, { ...ev, type: 'buy', quantity: 1 })).not.toBeNull();
    expect(validateEvent('crypto', null, { ...ev, type: 'deposit' })).not.toBeNull();
    expect(validateEvent('crypto', null, { ...ev, type: 'sell', quantity: NaN })).not.toBeNull();
    expect(validateEvent('fund', null, { ...ev, amountEur: -1 })).not.toBeNull();
  });
});

describe('validateEvent importe 0', () => {
  const ev = { type: 'deposit' as const, date: '2026-01-01', amountEur: 0, quantity: null };
  it('permite 0 solo en ajuste de saldo y valoración', () => {
    expect(validateEvent('cash', null, { ...ev, type: 'balance_adjust' })).toBeNull();
    expect(validateEvent('fund', null, { ...ev, type: 'valuation' })).toBeNull();
  });
  it('rechaza 0 en aportar, retirar, comprar y vender', () => {
    expect(validateEvent('cash', null, ev)).not.toBeNull();
    expect(validateEvent('cash', null, { ...ev, type: 'withdrawal' })).not.toBeNull();
    expect(validateEvent('crypto', null, { ...ev, type: 'buy', quantity: 1 })).not.toBeNull();
    expect(validateEvent('crypto', null, { ...ev, type: 'sell', quantity: 1 })).not.toBeNull();
  });
});
