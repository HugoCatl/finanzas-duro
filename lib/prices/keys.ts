import type { Holding } from '@/lib/types';

const YAHOO_PREFIX = 'yf:';

type Priceable = Pick<Holding, 'kind' | 'coingeckoId' | 'priceSymbol'>;

/** Clave en price_cache: id de CoinGecko para cripto, `yf:<símbolo>` para fondos y acciones con símbolo de Yahoo. */
export function priceKey(h: Priceable): string | null {
  if (h.kind === 'crypto') return h.coingeckoId;
  if ((h.kind === 'fund' || h.kind === 'stock') && h.priceSymbol) return `${YAHOO_PREFIX}${h.priceSymbol}`;
  return null;
}

/** Claves únicas de las posiciones activas con precio automático. */
export function activePriceKeys(holdings: (Priceable & Pick<Holding, 'archived'>)[]): string[] {
  return [...new Set(holdings.filter((h) => !h.archived).map(priceKey).filter((k): k is string => !!k))];
}

export const isYahooKey = (key: string) => key.startsWith(YAHOO_PREFIX);
export const yahooSymbol = (key: string) => key.slice(YAHOO_PREFIX.length);
