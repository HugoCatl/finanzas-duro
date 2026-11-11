import { describe, it, expect } from 'vitest';
import { cleanReceipt, validReceiptImage } from './receipt';

describe('cleanReceipt', () => {
  it('deja pasar un ticket normal', () => {
    expect(cleanReceipt({ amount: 23.456, merchant: '  Mercadona ', date: '2026-11-03' }, '2026-11-04'))
      .toEqual({ amount: 23.46, merchant: 'Mercadona', date: '2026-11-03' });
  });
  it('descarta importes y fechas imposibles', () => {
    expect(cleanReceipt({ amount: -5, merchant: '', date: '2026-12-01' }, '2026-11-04')).toEqual({ amount: null, merchant: null, date: null });
    expect(cleanReceipt({ amount: 1e9, date: '03/11/2026' }, '2026-11-04')).toEqual({ amount: null, merchant: null, date: null });
    expect(cleanReceipt(null, '2026-11-04')).toEqual({ amount: null, merchant: null, date: null });
  });
});

describe('validReceiptImage', () => {
  it('solo base64 de tamaño razonable', () => {
    expect(validReceiptImage('A'.repeat(1000))).toBe(true);
    expect(validReceiptImage('data:image/jpeg;base64,AAAA')).toBe(false);
    expect(validReceiptImage('A'.repeat(2_000_000))).toBe(false);
    expect(validReceiptImage(42)).toBe(false);
  });
});
