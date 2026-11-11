import 'server-only';
import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData, Price, Settings } from '@/lib/types';
import { addMonths, monthOf, todayIn } from '@/lib/dates';
import { isStale } from '@/lib/prices/coingecko';
import { activePriceKeys } from '@/lib/prices/keys';
import { refreshPrices } from '@/lib/prices/refresh';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  type Row, isTransferRow, toTransfer, toAccount, toRate, toAlert, toCategory, toEvent, toHolding, toPrice, toRecurring, toSettings, toSnapshot, toTransaction,
} from './mappers';

export type Res = { data: unknown; error: { message: string } | null };

export function must(res: Res): Row[] {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as Row[];
}

const PAGE = 1000;
export async function all(page: (from: number, to: number) => PromiseLike<Res>): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const rows = must(await page(from, from + PAGE - 1));
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

const DEFAULT_SETTINGS: Settings = { bigExpenseThreshold: 100, timezone: 'Europe/Madrid', netWorthTarget: null };

/** Partes opcionales de los datos; ajustes, cuentas y categorías se cargan siempre. */
export type DataPart = 'holdings' | 'transactions' | 'recurring' | 'snapshots' | 'alerts';
const ALL_PARTS: readonly DataPart[] = ['holdings', 'transactions', 'recurring', 'snapshots', 'alerts'];
const none = Promise.resolve([] as Row[]);

/**
 * `staleRefresh: 'background'` (pantallas de la app): con precios viejos pinta con los guardados y los
 * refresca después de responder; solo espera si falta alguno. Por defecto (crons) espera al refresco.
 * `parts` limita lo que se lee: lo que no se pide llega vacío. `holdings` incluye sus eventos y precios.
 */
export async function loadUserData(
  db: SupabaseClient, userId: string, now: Date = new Date(),
  opts: { staleRefresh?: 'block' | 'background'; parts?: readonly DataPart[] } = {},
): Promise<AppData> {
  const want = new Set(opts.parts ?? ALL_PARTS);
  const q = (table: string) => db.from(table).select('*').eq('user_id', userId);
  // Todo en una sola ronda: la ventana de fechas se calcula con la zona por defecto y un mes de margen,
  // y luego se recorta con la del usuario.
  const roughMonth = monthOf(todayIn(DEFAULT_SETTINGS.timezone, now));
  const [settingsRows, accounts, rates, categories, holdings, events, transactions, recurring, snapshots, alerts] = await Promise.all([
    q('settings').then(must),
    q('accounts').order('sort_order').then(must),
    // Sin la tabla (migración aún sin aplicar) se sigue funcionando, sin remuneración.
    q('account_rates').order('from_date').then((res) => (res.error?.code === 'PGRST205' || res.error?.code === '42P01' ? [] : must(res))),
    q('categories').order('sort_order').then(must),
    want.has('holdings') ? q('holdings').order('created_at').then(must) : none,
    want.has('holdings') ? all((f, t) => q('holding_events').order('date').order('created_at').order('id').range(f, t)) : none,
    want.has('transactions')
      ? all((f, t) => q('transactions').gte('date', `${addMonths(roughMonth, -13)}-01`).order('date', { ascending: false }).order('created_at', { ascending: false }).order('id').range(f, t))
      : none,
    want.has('recurring') ? q('recurring').order('day_of_month').then(must) : none,
    want.has('snapshots') ? all((f, t) => q('snapshots').order('date').order('id').range(f, t)) : none,
    want.has('alerts') ? q('alerts').gte('month', `${addMonths(roughMonth, -1)}-01`).order('sent_at', { ascending: false }).then(must) : none,
  ]);

  const settings = settingsRows[0] ? toSettings(settingsRows[0]) : DEFAULT_SETTINGS;
  const today = todayIn(settings.timezone, now);
  const month = monthOf(today);
  const since = `${addMonths(month, -12)}-01`;
  const txRows = transactions.filter((r) => String(r.date) >= since);

  const holdingList = holdings.map(toHolding);
  const prices = want.has('holdings') ? await loadPrices(db, activePriceKeys(holdingList), now, opts.staleRefresh ?? 'block') : {};

  return {
    userId,
    today,
    settings,
    accounts: accounts.map(toAccount),
    rates: rates.map(toRate),
    holdings: holdingList,
    events: events.map(toEvent),
    transactions: txRows.filter((r) => !isTransferRow(r)).map(toTransaction),
    transfers: txRows.filter(isTransferRow).map(toTransfer),
    categories: categories.map(toCategory),
    recurring: recurring.map(toRecurring),
    prices,
    snapshots: snapshots.map(toSnapshot),
    alerts: alerts.filter((r) => String(r.month).slice(0, 7) === month).map(toAlert),
  };
}

async function loadPrices(
  db: SupabaseClient, ids: string[], now: Date, staleRefresh: 'block' | 'background',
): Promise<Record<string, Price>> {
  if (ids.length === 0) return {};
  const read = async () => {
    const rows = must(await db.from('price_cache').select('*').in('coingecko_id', ids));
    return Object.fromEntries(rows.map(toPrice).map((p) => [p.coingeckoId, p]));
  };
  let prices = await read();
  if (staleRefresh === 'background' && ids.every((id) => prices[id])) {
    if (ids.some((id) => isStale(prices[id], now))) {
      after(() => refreshPrices(createAdminClient(), ids).catch((e) => console.error('No se pudieron refrescar los precios', e)));
    }
    return prices;
  }
  if (ids.some((id) => isStale(prices[id], now))) {
    try {
      await refreshPrices(createAdminClient(), ids);
      prices = await read();
    } catch (e) {
      console.error('No se pudieron refrescar los precios', e); // se usan los últimos guardados
    }
  }
  return prices;
}
