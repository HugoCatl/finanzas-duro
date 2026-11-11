import type { Closes } from '@/lib/finance/position-history';

/** Medio día: el historial cambia una vez al día y así la pantalla abre al instante casi siempre. */
const REVALIDATE = 43_200;
const TIMEOUT_MS = 4000;
/** MSCI World en euros (iShares Core MSCI World, Ámsterdam). */
export const WORLD_SYMBOL = 'IWDA.AS';

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

interface YahooChart {
  chart?: { result?: { meta?: { currency?: string }; timestamp?: number[]; indicators?: { quote?: { close?: (number | null)[] }[] } }[] };
}

/** Cierres diarios de la respuesta de Yahoo; null si no son en euros o no hay datos. */
export function parseYahooCloses(json: YahooChart): Closes | null {
  const r = json.chart?.result?.[0];
  if (r?.meta?.currency !== 'EUR' || !r.timestamp) return null;
  const closes = r.indicators?.quote?.[0]?.close ?? [];
  const out: Closes = {};
  r.timestamp.forEach((t, i) => { const c = closes[i]; if (typeof c === 'number') out[day(t * 1000)] = c; });
  return Object.keys(out).length ? out : null;
}

/** Cierres diarios de CoinGecko (`prices: [ms, eur][]`); con varios puntos el mismo día se queda el último. */
export function parseCoingeckoCloses(json: { prices?: [number, number][] }): Closes | null {
  const out: Closes = {};
  for (const [ms, p] of json.prices ?? []) if (typeof p === 'number') out[day(ms)] = p;
  return Object.keys(out).length ? out : null;
}

async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json', ...headers }, next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return (await res.json()) as T;
  } catch (e) {
    console.error('No se pudo obtener el historial', e);
    return null;
  }
}

/** Hasta 10 años de cierres diarios de un símbolo de Yahoo Finance. */
export async function yahooCloses(symbol: string): Promise<Closes | null> {
  const json = await getJson<YahooChart>(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=10y&interval=1d`, { 'user-agent': 'Mozilla/5.0' },
  );
  return json ? parseYahooCloses(json) : null;
}

/** Cierres diarios de una cripto: el último año, o todo si la posición es más antigua. */
export async function coingeckoCloses(id: string, longer = false): Promise<Closes | null> {
  const json = await getJson<{ prices?: [number, number][] }>(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=eur&days=${longer ? 'max' : 365}&interval=daily`,
  );
  return json ? parseCoingeckoCloses(json) : null;
}

interface JsonStat { value?: Record<string, number>; dimension?: { time?: { category?: { index?: Record<string, number> } } } }

/** Índice mensual de precios (YYYY-MM → índice) de una respuesta JSON-stat de Eurostat. */
export function parseEurostat(json: JsonStat): Record<string, number> | null {
  const index = json.dimension?.time?.category?.index;
  if (!index || !json.value) return null;
  const out: Record<string, number> = {};
  for (const [period, pos] of Object.entries(index)) {
    const v = json.value[String(pos)];
    const m = period.replace(/^(\d{4})M?-?(\d{2})$/, '$1-$2');
    if (typeof v === 'number' && /^\d{4}-\d{2}$/.test(m)) out[m] = v;
  }
  return Object.keys(out).length ? out : null;
}

/** IPC armonizado de España desde 2015 (Eurostat, sin clave). */
export async function spainHicp(): Promise<Record<string, number> | null> {
  const json = await getJson<JsonStat>(
    'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_minr?format=JSON&lang=EN&geo=ES&unit=I15&coicop18=TOTAL&sinceTimePeriod=2015-01',
  );
  return json ? parseEurostat(json) : null;
}
