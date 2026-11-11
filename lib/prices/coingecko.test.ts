import { describe, it, expect, vi } from 'vitest';
import { fetchPrices, isStale } from './coingecko';

describe('fetchPrices', () => {
  it('pide los ids en EUR y mapea la respuesta, ignorando ids desconocidos', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({
      bitcoin: { eur: 61000.5, eur_24h_change: -1.25 },
    }), { status: 200 }));
    const now = new Date('2026-10-29T10:00:00Z');
    const prices = await fetchPrices(['bitcoin', 'nope'], fetchFn as unknown as typeof fetch, now);
    expect(fetchFn).toHaveBeenCalledWith(expect.stringContaining('ids=bitcoin%2Cnope'), expect.anything());
    expect(prices).toEqual([{ coingeckoId: 'bitcoin', priceEur: 61000.5, change24h: -1.25, updatedAt: now.toISOString() }]);
  });
  it('sin ids no llama a la API', async () => {
    const fetchFn = vi.fn();
    expect(await fetchPrices([], fetchFn as unknown as typeof fetch)).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it('lanza error si la API falla', async () => {
    const fetchFn = vi.fn(async () => new Response('rate limited', { status: 429 }));
    await expect(fetchPrices(['bitcoin'], fetchFn as unknown as typeof fetch)).rejects.toThrow('CoinGecko 429');
  });
});

describe('fetchPrices: timeout', () => {
  it('pasa una señal de aborto con timeout al fetch', async () => {
    const fetchFn = vi.fn(async () => new Response('{}', { status: 200 }));
    await fetchPrices(['bitcoin'], fetchFn as unknown as typeof fetch);
    const init = (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
  it('un fetch abortado por timeout se trata como fallo (rechaza)', async () => {
    const fetchFn = vi.fn(async () => { throw new DOMException('The operation timed out.', 'TimeoutError'); });
    await expect(fetchPrices(['bitcoin'], fetchFn as unknown as typeof fetch)).rejects.toThrow(/timed out/);
  });
});

describe('isStale', () => {
  const now = new Date('2026-10-29T10:00:00Z');
  it('undefined → caducado', () => expect(isStale(undefined, now)).toBe(true));
  it('hace 10 min → vigente', () => {
    expect(isStale({ coingeckoId: 'x', priceEur: 1, change24h: null, updatedAt: '2026-10-29T09:50:00Z' }, now)).toBe(false);
  });
  it('hace 16 min → caducado', () => {
    expect(isStale({ coingeckoId: 'x', priceEur: 1, change24h: null, updatedAt: '2026-10-29T09:44:00Z' }, now)).toBe(true);
  });
});
