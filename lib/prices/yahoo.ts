import type { Price } from '@/lib/types';
import { FETCH_TIMEOUT_MS } from './coingecko';

interface ChartMeta { currency?: string; regularMarketPrice?: number; chartPreviousClose?: number }

/** Último precio de cada símbolo en Yahoo Finance. Solo se aceptan cotizaciones en EUR. */
export async function fetchYahooPrices(symbols: string[], fetchFn: typeof fetch = fetch, now: Date = new Date()): Promise<Price[]> {
  const results = await Promise.allSettled(symbols.map(async (symbol): Promise<Price | null> => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    const res = await fetchFn(url, {
      headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' }, cache: 'no-store', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Yahoo ${res.status} (${symbol})`);
    const json = (await res.json()) as {
      chart?: { result?: { meta?: ChartMeta; indicators?: { quote?: { close?: (number | null)[] }[] } }[] };
    };
    const result = json.chart?.result?.[0];
    const meta = result?.meta;
    if (meta?.currency !== 'EUR' || typeof meta.regularMarketPrice !== 'number') return null;
    // chartPreviousClose es el cierre de antes de los 5 días: la variación del día se mide con el penúltimo cierre.
    const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter((c): c is number => typeof c === 'number');
    const prev = closes.length >= 2 ? closes.at(-2) : undefined;
    return {
      coingeckoId: `yf:${symbol}`,
      priceEur: meta.regularMarketPrice,
      change24h: prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : null,
      updatedAt: now.toISOString(),
    };
  }));
  return results.flatMap((r) => {
    if (r.status === 'rejected') {
      console.error('No se pudo obtener el precio de Yahoo', r.reason);
      return [];
    }
    return r.value ? [r.value] : [];
  });
}
