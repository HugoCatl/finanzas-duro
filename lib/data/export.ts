import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Account, AiSummary, Alert, Category, Holding, HoldingEvent, Price, Recurring, Settings, Snapshot, Transaction } from '@/lib/types';
import { todayIn } from '@/lib/dates';
import { priceKey } from '@/lib/prices/keys';
import { all, must } from './load';
import {
  toAccount, toAiSummary, toAlert, toCategory, toEvent, toHolding, toPrice, toRecurring, toSettings, toSnapshot, toTransaction,
} from './mappers';

export interface ExportData {
  exportedAt: string;
  today: string;
  settings: Settings;
  accounts: Account[];
  holdings: Holding[];
  events: HoldingEvent[];
  transactions: Transaction[];
  categories: Category[];
  recurring: Recurring[];
  prices: Record<string, Price>;
  snapshots: Snapshot[];
  alerts: Alert[];
  aiSummaries: AiSummary[];
}

/**
 * Carga TODOS los datos del usuario, sin ventanas de fechas (a diferencia de `loadUserData`).
 * Solo para exportar: usa el cliente RLS del usuario y filtra además por `user_id`.
 */
export async function loadExportData(db: SupabaseClient, userId: string, now: Date = new Date()): Promise<ExportData> {
  const q = (table: string) => db.from(table).select('*').eq('user_id', userId);

  const settingsRows = must(await db.from('settings').select('*').eq('user_id', userId));
  const settings: Settings = settingsRows[0] ? toSettings(settingsRows[0]) : { bigExpenseThreshold: 100, timezone: 'Europe/Madrid', netWorthTarget: null };

  const [accounts, holdings, events, transactions, categories, recurring, snapshots, alerts, summaries] = await Promise.all([
    q('accounts').order('sort_order').order('id').then(must),
    q('holdings').order('created_at').order('id').then(must),
    all((f, t) => q('holding_events').order('date').order('created_at').order('id').range(f, t)),
    all((f, t) => q('transactions').order('date', { ascending: false }).order('created_at', { ascending: false }).order('id').range(f, t)),
    q('categories').order('sort_order').order('id').then(must),
    q('recurring').order('day_of_month').order('id').then(must),
    all((f, t) => q('snapshots').order('date').order('id').range(f, t)),
    all((f, t) => q('alerts').order('sent_at', { ascending: false }).order('id').range(f, t)),
    all((f, t) => q('ai_summaries').order('created_at', { ascending: false }).order('id').range(f, t)),
  ]);

  const holdingList = holdings.map(toHolding);
  const keys = [...new Set(holdingList.map(priceKey).filter((k): k is string => !!k))];
  const priceRows = keys.length ? must(await db.from('price_cache').select('*').in('coingecko_id', keys)) : [];

  return {
    exportedAt: now.toISOString(),
    today: todayIn(settings.timezone, now),
    settings,
    accounts: accounts.map(toAccount),
    holdings: holdingList,
    events: events.map(toEvent),
    transactions: transactions.map(toTransaction),
    categories: categories.map(toCategory),
    recurring: recurring.map(toRecurring),
    prices: Object.fromEntries(priceRows.map(toPrice).map((p) => [p.coingeckoId, p])),
    snapshots: snapshots.map(toSnapshot),
    alerts: alerts.map(toAlert),
    aiSummaries: summaries.map(toAiSummary),
  };
}
