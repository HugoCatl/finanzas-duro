import { describe, it, expect } from 'vitest';
import { parseCsv } from './csv';
import { cardCategory, parseTradeRepublic } from './trade-republic';

const COLS = ['datetime', 'date', 'category', 'type', 'asset_class', 'name', 'symbol', 'shares', 'amount', 'fee', 'tax', 'transaction_id', 'counterparty_name', 'counterparty_iban', 'mcc_code'];
const row = (p: Record<string, string>) => COLS.map((c) => `"${(p[c] ?? '').replace(/"/g, '""')}"`).join(',');
const csv = (...rows: Record<string, string>[]) => [COLS.map((c) => `"${c}"`).join(','), ...rows.map(row)].join('\n');

const ME = { counterparty_name: 'ANA PEREZ GIL', counterparty_iban: 'ES00MIA1' };
const sample = csv(
  { date: '2025-12-30', type: 'CARD_TRANSACTION', name: 'VIEJO', amount: '-5', transaction_id: 'old' },
  { date: '2026-07-02', type: 'TRANSFER_INBOUND', amount: '2700', transaction_id: 't1', ...ME },
  { date: '2026-07-04', type: 'TRANSFER_INSTANT_INBOUND', amount: '600', transaction_id: 't2', ...ME },
  { date: '2026-07-20', type: 'TRANSFER_INSTANT_OUTBOUND', amount: '-150', transaction_id: 't3', counterparty_name: 'Ana Pérez Gil', counterparty_iban: 'ES00MIA2' },
  { date: '2026-10-01', type: 'TRANSFER_INBOUND', amount: '115', transaction_id: 't4', counterparty_name: 'JUNG S.A.S.', counterparty_iban: 'FR00' },
  { date: '2026-07-03', type: 'BUY', asset_class: 'STOCK', name: 'Alphabet (A)', symbol: 'US02079K3059', shares: '0.0796680000', amount: '-25.00', fee: '-1.00', transaction_id: 'b1' },
  { date: '2026-07-04', type: 'FREE_RECEIPT', asset_class: 'CRYPTO', name: 'Bitcoin', symbol: 'BTC', shares: '0.0010650000', transaction_id: 'b2' },
  { date: '2026-08-03', type: 'BUY', asset_class: 'CRYPTO', name: 'Bitcoin', symbol: 'BTC', shares: '0.000891', amount: '-49.99', transaction_id: 'b3' },
  { date: '2026-08-01', type: 'INTEREST_PAYMENT', amount: '11.760000', tax: '-2.24', transaction_id: 'i1' },
  { date: '2026-09-14', type: 'DIVIDEND', asset_class: 'STOCK', name: 'Alphabet (A)', symbol: 'US02079K3059', amount: '0.020000', transaction_id: 'd1' },
  { date: '2026-10-08', type: 'CARD_TRANSACTION', name: 'ALDI SAGUNTO', amount: '-12.40', mcc_code: '5411', transaction_id: 'c1' },
  { date: '2026-10-09', type: 'CARD_TRANSACTION', name: 'DULCES ISA SL', amount: '-2.35', mcc_code: '5411', transaction_id: 'c2' },
  { date: '2026-10-10', type: 'SAVEBACK', amount: '1', transaction_id: 'x1' },
);

describe('parseCsv', () => {
  it('respeta comas, comillas escapadas y saltos dentro de comillas, y quita el BOM', () => {
    expect(parseCsv('﻿"a","b"\r\n"1,5","dice ""hola""\nadiós"\n')).toEqual([['a', 'b'], ['1,5', 'dice "hola"\nadiós']]);
  });
});

describe('cardCategory', () => {
  it('las reglas de comercio van por delante del MCC; un MCC desconocido es Otros', () => {
    expect(cardCategory('CHARTER VIVER COOPERATIV', '5411')).toBe('Merienda');
    expect(cardCategory('MERCADONA', '5411')).toBe('Supermercado');
    expect(cardCategory('BK12872', '5814')).toBe('Comida fuera');
    expect(cardCategory('Back Market', '5931')).toBe('Otros');
  });
});

describe('parseTradeRepublic', () => {
  const r = parseTradeRepublic(sample, { since: '2026-01-01' });

  it('ignora lo anterior a la fecha de corte y los tipos desconocidos', () => {
    expect(r.skipped).toEqual({ old: 1, ownTransfers: 3, unknown: 1 });
  });

  it('deduce los traspasos propios por el nombre (sin tildes) y deja los de terceros como ingreso', () => {
    expect(r.counterparties.map((c) => [c.key, c.own])).toEqual([['ES00MIA1', true], ['ES00MIA2', true], ['FR00', false]]);
    expect(r.transactions.find((t) => t.ref === 'tr:t4')).toEqual({ ref: 'tr:t4', date: '2026-10-01', amount: 115, merchant: 'JUNG S.A.S.', category: 'Otros ingresos' });
  });

  it('con contrapartes elegidas a mano usa esa elección', () => {
    const manual = parseTradeRepublic(sample, { since: '2026-01-01', own: ['ES00MIA1'] });
    expect(manual.skipped.ownTransfers).toBe(2);
    expect(manual.transactions.find((t) => t.ref === 'tr:t3')).toMatchObject({ amount: -150, category: 'Otros' });
  });

  it('compras con comisión, entradas sin coste y cripto frente a acciones', () => {
    expect(r.trades).toEqual([
      { ref: 'tr:b1', date: '2026-07-03', type: 'buy', amountEur: 26, quantity: 0.079668, asset: { symbol: 'US02079K3059', isin: 'US02079K3059', name: 'Alphabet (A)', crypto: false } },
      { ref: 'tr:b2', date: '2026-07-04', type: 'buy', amountEur: 0, quantity: 0.001065, asset: { symbol: 'BTC', isin: null, name: 'Bitcoin', crypto: true } },
      { ref: 'tr:b3', date: '2026-08-03', type: 'buy', amountEur: 49.99, quantity: 0.000891, asset: { symbol: 'BTC', isin: null, name: 'Bitcoin', crypto: true } },
    ]);
  });

  it('intereses netos de retención, dividendos y gastos con tarjeta categorizados', () => {
    const byRef = Object.fromEntries(r.transactions.map((t) => [t.ref, t]));
    expect(byRef['tr:i1']).toMatchObject({ amount: 9.52, category: 'Intereses' });
    expect(byRef['tr:d1']).toMatchObject({ amount: 0.02, category: 'Intereses', merchant: 'Dividendo Alphabet (A)' });
    expect(byRef['tr:c1']).toMatchObject({ amount: -12.4, merchant: 'ALDI SAGUNTO', category: 'Supermercado' });
    expect(byRef['tr:c2']).toMatchObject({ category: 'Merienda' });
  });

  it('rechaza un CSV que no es de Trade Republic', () => {
    expect(() => parseTradeRepublic('"fecha","importe"\n"2026-01-01","5"', { since: '2026-01-01' })).toThrow('Trade Republic');
  });
});
