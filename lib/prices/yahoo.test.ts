import { describe, it, expect, vi } from 'vitest';
import { fetchYahooPrices } from './yahoo';

const chart = (meta: object, close: (number | null)[] = []) =>
  new Response(JSON.stringify({ chart: { result: [{ meta, indicators: { quote: [{ close }] } }] } }), { status: 200 });

describe('fetchYahooPrices', () => {
  const now = new Date('2026-11-03T10:00:00Z');

  it('mapea el precio en EUR y la variación frente al cierre de ayer, no al de hace 5 días', async () => {
    const fetchFn = vi.fn(async () => chart({ currency: 'EUR', regularMarketPrice: 250, chartPreviousClose: 300 }, [290, null, 200, 250]));
    const prices = await fetchYahooPrices(['ABEA.DE'], fetchFn as unknown as typeof fetch, now);
    expect(fetchFn).toHaveBeenCalledWith(expect.stringContaining('/chart/ABEA.DE?'), expect.anything());
    expect(prices).toEqual([{ coingeckoId: 'yf:ABEA.DE', priceEur: 250, change24h: 25, updatedAt: now.toISOString() }]);
  });

  it('descarta las cotizaciones que no están en EUR', async () => {
    const fetchFn = vi.fn(async () => chart({ currency: 'USD', regularMarketPrice: 279 }));
    expect(await fetchYahooPrices(['GOOGL'], fetchFn as unknown as typeof fetch, now)).toEqual([]);
  });

  it('un símbolo que falla no impide los demás', async () => {
    const fetchFn = vi.fn(async (url: string) => (url.includes('MAL')
      ? new Response('no', { status: 404 })
      : chart({ currency: 'EUR', regularMarketPrice: 14.456 })));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const prices = await fetchYahooPrices(['MAL', '0P0001CLDK.F'], fetchFn as unknown as typeof fetch, now);
    expect(prices.map((p) => p.coingeckoId)).toEqual(['yf:0P0001CLDK.F']);
    expect(prices[0].change24h).toBeNull();
    spy.mockRestore();
  });

  it('sin símbolos no llama a la API', async () => {
    const fetchFn = vi.fn();
    expect(await fetchYahooPrices([], fetchFn as unknown as typeof fetch)).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
