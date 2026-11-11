import { describe, it, expect } from 'vitest';
import { toTransaction, toHolding, toEvent, toSnapshot } from './mappers';

describe('mappers', () => {
  it('toTransaction convierte numeric (string) a number y conserva nulls', () => {
    expect(toTransaction({
      id: 't1', date: '2026-10-01', amount: '-12.50', merchant: null, note: null, category_id: null,
      account_id: 'a1', source: 'manual', recurring_id: null, user_id: 'u',
    })).toEqual({
      id: 't1', date: '2026-10-01', amount: -12.5, merchant: null, note: null, categoryId: null,
      accountId: 'a1', source: 'manual', recurringId: null,
    });
  });
  it('toHolding: apy null y numérico', () => {
    expect(toHolding({ id: 'h', account_id: 'a', name: 'TR', kind: 'savings', apy: '0.0225', coingecko_id: null, isin: null, archived: false }).apy).toBe(0.0225);
    expect(toHolding({ id: 'h', account_id: 'a', name: 'BTC', kind: 'crypto', apy: null, coingecko_id: 'bitcoin', isin: null, archived: false }).apy).toBeNull();
  });
  it('toEvent: cantidad de cripto como number', () => {
    expect(toEvent({ id: 'e', holding_id: 'h', date: '2026-01-01', type: 'buy', amount_eur: '100', quantity: '0.0015000000', unit_price_eur: '66666.66666667' }).quantity).toBe(0.0015);
  });
  it('toSnapshot: jsonb numérico', () => {
    expect(toSnapshot({ date: '2026-10-01', net_worth: '1000.00', by_account: { a: 1000 }, by_kind: { cash: 1000 } }))
      .toEqual({ date: '2026-10-01', netWorth: 1000, byAccount: { a: 1000 }, byKind: { cash: 1000 } });
  });
});
