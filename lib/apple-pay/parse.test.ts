import { describe, it, expect } from 'vitest';
import { bearerToken, hashToken, matchAccount, parseApplePay } from './parse';

describe('parseApplePay', () => {
  it('acepta el importe con formato español, inglés o número', () => {
    expect(parseApplePay({ amount: '12,50 €', merchant: ' Mercadona ', card: 'ING' })).toEqual({ amount: 12.5, merchant: 'Mercadona', card: 'ING' });
    expect(parseApplePay({ amount: '€12.50' })).toEqual({ amount: 12.5, merchant: null, card: null });
    expect(parseApplePay({ amount: '1.234,56 €' })).toMatchObject({ amount: 1234.56 });
    expect(parseApplePay({ amount: 3 })).toMatchObject({ amount: 3 });
    expect(parseApplePay({ amount: '-4,20 €' })).toMatchObject({ amount: 4.2 });
  });
  it('rechaza lo que no es un importe', () => {
    expect(parseApplePay({ amount: '' })).toBe('Importe no válido');
    expect(parseApplePay({ amount: '0,00 €' })).toBe('Importe no válido');
    expect(parseApplePay({ amount: '999999' })).toBe('Importe no válido');
    expect(parseApplePay(null)).toBe('Cuerpo no válido');
  });
});

describe('matchAccount', () => {
  const accounts = [{ id: 'ing', name: 'ING' }, { id: 'rev', name: 'Revolut' }, { id: 'tr', name: 'Trade Republic' }];
  it('busca el nombre de la cuenta dentro del de la tarjeta', () => {
    expect(matchAccount(accounts, 'Revolut Mastercard')).toBe('rev');
    expect(matchAccount(accounts, 'TRADE REPUBLIC Visa')).toBe('tr');
    expect(matchAccount(accounts, 'Visa ING')).toBe('ing');
  });
  it('sin coincidencia de palabra entera no asigna cuenta', () => {
    expect(matchAccount(accounts, 'Bankinter')).toBeNull();
    expect(matchAccount(accounts, 'Swinging Card')).toBeNull();
    expect(matchAccount(accounts, null)).toBeNull();
  });
});

describe('token', () => {
  it('lee el Bearer y lo convierte en hash estable', () => {
    expect(bearerToken('Bearer fin_abcdefghijklmnopqrstuvwxyz')).toBe('fin_abcdefghijklmnopqrstuvwxyz');
    expect(bearerToken('Bearer corto')).toBeNull();
    expect(bearerToken(null)).toBeNull();
    expect(hashToken('a')).toBe(hashToken('a'));
    expect(hashToken('a')).toHaveLength(64);
  });
});
