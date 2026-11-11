import type { Price } from '@/lib/types';

/** Un CoinGecko lento no debe bloquear el render: al expirar, los llamadores usan los precios en caché. */
export const FETCH_TIMEOUT_MS = 3000;

export async function fetchPrices(ids: string[], fetchFn: typeof fetch = fetch, now: Date = new Date()): Promise<Price[]> {
  if (ids.length === 0) return [];
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(','))}&vs_currencies=eur&include_24hr_change=true`;
  const res = await fetchFn(url, { headers: { accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const json = (await res.json()) as Record<string, { eur?: number; eur_24h_change?: number } | undefined>;
  return ids.flatMap((id) => {
    const p = json[id];
    if (p?.eur === undefined) return [];
    return [{ coingeckoId: id, priceEur: p.eur, change24h: p.eur_24h_change ?? null, updatedAt: now.toISOString() }];
  });
}

export function isStale(price: Price | undefined, now: Date = new Date(), maxAgeMin = 15): boolean {
  if (!price) return true;
  return now.getTime() - new Date(price.updatedAt).getTime() > maxAgeMin * 60_000;
}
