import { describe, it, expect } from 'vitest';
import { validatePushEndpoint, validatePushSubscription, validateThreshold } from './validate';

const ok = { endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'abc', auth: 'def' } };

describe('validateThreshold', () => {
  it('acepta importes positivos finitos', () => expect(validateThreshold(50)).toBeNull());
  it.each([0, -1, NaN, Infinity, 1e12, '5' as unknown as number])('rechaza %s', (v) => {
    expect(validateThreshold(v)).toBe('Importe no válido');
  });
});

describe('validatePushSubscription', () => {
  it('acepta una suscripción https completa', () => expect(validatePushSubscription(ok)).toBeNull());
  it('rechaza http, claves vacías o ausentes y endpoints enormes', () => {
    expect(validatePushSubscription({ ...ok, endpoint: 'http://x' })).toBe('Suscripción no válida');
    expect(validatePushSubscription({ ...ok, keys: { p256dh: '', auth: 'd' } })).toBe('Suscripción no válida');
    expect(validatePushSubscription({ endpoint: ok.endpoint } as never)).toBe('Suscripción no válida');
    expect(validatePushSubscription({ ...ok, endpoint: 'https://x/' + 'a'.repeat(3000) })).toBe('Suscripción no válida');
  });
});

describe('validatePushEndpoint', () => {
  it('acepta https y rechaza vacío, http o no texto', () => {
    expect(validatePushEndpoint('https://push.example/abc')).toBeNull();
    expect(validatePushEndpoint('')).not.toBeNull();
    expect(validatePushEndpoint('http://push.example/abc')).not.toBeNull();
    expect(validatePushEndpoint(undefined)).not.toBeNull();
  });
});
