import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { HoldingKind, Price } from '@/lib/types';
import { fetchPrices } from './coingecko';
import { activePriceKeys, isYahooKey, yahooSymbol } from './keys';
import { fetchYahooPrices } from './yahoo';

/** Refresca price_cache: las claves `yf:` en Yahoo y el resto en CoinGecko. Un proveedor caído no frena al otro. */
export async function refreshPrices(admin: SupabaseClient, keys: string[]): Promise<void> {
  const yahoo = keys.filter(isYahooKey).map(yahooSymbol);
  const results = await Promise.allSettled([fetchPrices(keys.filter((k) => !isYahooKey(k))), fetchYahooPrices(yahoo)]);
  const prices: Price[] = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  if (prices.length > 0) {
    const { error } = await admin.from('price_cache').upsert(
      prices.map((p) => ({ coingecko_id: p.coingeckoId, price_eur: p.priceEur, change_24h: p.change24h, updated_at: p.updatedAt })),
    );
    if (error) throw new Error(error.message);
  }
  const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failed) throw failed.reason;
}

/** Claves de precio de todas las posiciones activas (de todos los usuarios), para los crons. */
export async function allActivePriceKeys(admin: SupabaseClient): Promise<string[]> {
  const { data, error } = await admin.from('holdings').select('kind, coingecko_id, price_symbol').eq('archived', false);
  if (error) throw new Error(error.message);
  return activePriceKeys((data ?? []).map((r) => ({
    kind: r.kind as HoldingKind, coingeckoId: r.coingecko_id as string | null, priceSymbol: r.price_symbol as string | null, archived: false,
  })));
}
